import type { Room, ServiceType, Ticket, TicketPriority } from '@shared/types'

const activeStatuses = new Set(['created', 'waiting', 'called', 'in_service', 'redirected'])
const waitingStatuses = new Set(['created', 'waiting', 'redirected'])

const defaultWorkdayEndHour = 18
const fallbackRemainingWorkMinutes = 60

const serviceDurationByType: Record<ServiceType, number> = {
  billing: 10,
  consultation: 18,
  diagnostics: 25,
  laboratory: 12,
  pharmacy: 8,
  registration: 10,
}

const priorityWeight: Record<TicketPriority, number> = {
  critical: 5,
  high: 4,
  above_normal: 3,
  normal: 2,
  low: 1,
}

type PlannedRoom = Room & {
  canFinishToday?: boolean
  plannedServiceMinutes?: number
  remainingWorkMinutes?: number
}

type RoomAccumulator = {
  assignedTickets: Ticket[]
  room: Room
  serviceMinutes: number
}

function parseTimestamp(value?: string): number | undefined {
  if (!value) {
    return undefined
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : undefined
}

function getRemainingWorkMinutes(now: number | Date = Date.now(), endHour = defaultWorkdayEndHour): number {
  const nowDate = typeof now === 'number' ? new Date(now) : now
  const endDate = new Date(nowDate)
  endDate.setHours(endHour, 0, 0, 0)

  const minutes = Math.floor((endDate.getTime() - nowDate.getTime()) / 60_000)

  return Math.max(0, minutes)
}

function getServiceDurationMinutes(ticket: Ticket): number {
  return serviceDurationByType[ticket.serviceType] ?? serviceDurationByType.consultation
}

function getRemainingServiceMinutes(ticket: Ticket, now: number | Date = Date.now()): number {
  if (!activeStatuses.has(ticket.status)) {
    return 0
  }

  const durationMinutes = getServiceDurationMinutes(ticket)

  if (ticket.status !== 'in_service') {
    return durationMinutes
  }

  const startedAt = parseTimestamp(ticket.startedAt)

  if (startedAt === undefined) {
    return durationMinutes
  }

  const nowTime = typeof now === 'number' ? now : now.getTime()
  const elapsedMinutes = Math.max(0, Math.floor((nowTime - startedAt) / 60_000))

  return Math.max(1, durationMinutes - elapsedMinutes)
}

function getWaitingMinutes(ticket: Ticket, now: number | Date = Date.now()): number {
  const createdAt = parseTimestamp(ticket.createdAt)

  if (createdAt === undefined) {
    return 0
  }

  const calledAt = parseTimestamp(ticket.calledAt)
  const endTime = calledAt ?? (typeof now === 'number' ? now : now.getTime())

  return Math.max(0, Math.floor((endTime - createdAt) / 60_000))
}

function hasServiceRestrictions(room: Room): boolean {
  return Boolean(
    room.serviceTypeIds?.length ||
    room.serviceTypes?.length ||
    room.services?.length,
  )
}

function normalizeServiceValue(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim().toLowerCase() || undefined
  }

  if (!value || typeof value !== 'object') {
    return undefined
  }

  const record = value as {
    id?: string | number
    name?: string
    serviceTypeId?: string | number
    title?: string
  }

  return normalizeServiceValue(record.serviceTypeId ?? record.id ?? record.name ?? record.title)
}

function roomSupportsTicket(room: Room, ticket: Ticket): boolean {
  if (!hasServiceRestrictions(room)) {
    return true
  }

  const serviceValues = [
    ...(room.serviceTypes ?? []),
    ...(room.services ?? []),
  ]
    .map(normalizeServiceValue)
    .filter((value): value is string => Boolean(value))

  if (serviceValues.length === 0) {
    return true
  }

  return serviceValues.includes(ticket.serviceType.toLowerCase())
}

function sortTicketsByQueueOrder(left: Ticket, right: Ticket): number {
  const leftIsCurrent = ['called', 'in_service'].includes(left.status)
  const rightIsCurrent = ['called', 'in_service'].includes(right.status)

  if (leftIsCurrent !== rightIsCurrent) {
    return leftIsCurrent ? -1 : 1
  }

  const priorityDelta = priorityWeight[right.priority] - priorityWeight[left.priority]

  if (priorityDelta !== 0) {
    return priorityDelta
  }

  return Date.parse(left.createdAt) - Date.parse(right.createdAt)
}

function createAccumulator(room: Room): RoomAccumulator {
  return {
    assignedTickets: [],
    room,
    serviceMinutes: 0,
  }
}

function getBestRoomForTicket(ticket: Ticket, rooms: RoomAccumulator[]): RoomAccumulator | undefined {
  const candidates = rooms.filter(({ room }) => roomSupportsTicket(room, ticket))
  const availableRooms = candidates.length > 0 ? candidates : rooms

  return availableRooms.reduce<RoomAccumulator | undefined>((bestRoom, room) => {
    if (!bestRoom) {
      return room
    }

    return room.serviceMinutes < bestRoom.serviceMinutes ? room : bestRoom
  }, undefined)
}

export function planRoomLoads(
  rooms: Room[],
  tickets: Ticket[],
  now: number | Date = Date.now(),
): { rooms: PlannedRoom[]; tickets: Ticket[] } {
  const remainingWorkMinutes = Math.max(
    getRemainingWorkMinutes(now),
    fallbackRemainingWorkMinutes,
  )
  const activeRooms = rooms.filter((room) => room.isActive !== false && room.status !== 'paused')
  const accumulators = new Map(activeRooms.map((room) => [room.id, createAccumulator(room)]))
  const plannedTickets = tickets.map((ticket) => ({ ...ticket }))
  const activeTickets = plannedTickets
    .filter((ticket) => activeStatuses.has(ticket.status))
    .sort(sortTicketsByQueueOrder)

  activeTickets
    .filter((ticket) => ticket.roomId && accumulators.has(ticket.roomId))
    .forEach((ticket) => {
      const accumulator = accumulators.get(ticket.roomId!)

      if (!accumulator) {
        return
      }

      accumulator.assignedTickets.push(ticket)
      accumulator.serviceMinutes += getRemainingServiceMinutes(ticket, now)
    })

  activeTickets
    .filter((ticket) => !ticket.roomId || !accumulators.has(ticket.roomId))
    .forEach((ticket) => {
      const accumulator = getBestRoomForTicket(ticket, Array.from(accumulators.values()))

      if (!accumulator) {
        return
      }

      ticket.roomId = accumulator.room.id
      accumulator.assignedTickets.push(ticket)
      accumulator.serviceMinutes += getRemainingServiceMinutes(ticket, now)
    })

  accumulators.forEach((accumulator) => {
    let minutesBeforeTicket = 0

    accumulator.assignedTickets
      .sort(sortTicketsByQueueOrder)
      .forEach((ticket) => {
        ticket.etaMinutes = waitingStatuses.has(ticket.status)
          ? Math.max(0, Math.round(minutesBeforeTicket))
          : 0
        minutesBeforeTicket += getRemainingServiceMinutes(ticket, now)
      })
  })

  const plannedRooms = rooms.map((room) => {
    const accumulator = accumulators.get(room.id)

    if (!accumulator) {
      return {
        ...room,
        currentTicketId: undefined,
        loadPercent: 0,
        plannedServiceMinutes: 0,
        remainingWorkMinutes,
        status: 'paused',
        workload: 0,
      } satisfies PlannedRoom
    }

    const waitingMinutes = accumulator.assignedTickets
      .filter((ticket) => waitingStatuses.has(ticket.status))
      .map((ticket) => getWaitingMinutes(ticket, now))
    const averageWaitingMinutes = waitingMinutes.length > 0
      ? waitingMinutes.reduce((sum, minutes) => sum + minutes, 0) / waitingMinutes.length
      : 0
    const currentTicket = accumulator.assignedTickets.find((ticket) =>
      ['called', 'in_service'].includes(ticket.status),
    )
    const loadPercent = Math.min(
      100,
      Math.round(((accumulator.serviceMinutes + averageWaitingMinutes) / remainingWorkMinutes) * 100),
    )

    return {
      ...room,
      canFinishToday: accumulator.serviceMinutes <= remainingWorkMinutes,
      currentTicketId: currentTicket?.id,
      loadPercent,
      plannedServiceMinutes: Math.round(accumulator.serviceMinutes),
      remainingWorkMinutes,
      status: currentTicket ? 'busy' : 'open',
      workload: loadPercent,
    } satisfies PlannedRoom
  })

  return {
    rooms: plannedRooms,
    tickets: plannedTickets,
  }
}
