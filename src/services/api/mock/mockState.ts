import { createInitialQueueSnapshot, calculateQueueKpi } from '@mock/queue.mock'
import { createMockTicket, createQueueEvent, getServiceTypeLabel } from '@shared/utils'
import type {
  QueueSnapshot,
  Room as SharedRoom,
  ServiceType as SharedServiceType,
  Ticket as SharedTicket,
  TicketCreateInput as SharedTicketCreateInput,
  TicketPriority as SharedTicketPriority,
  TicketStatus as SharedTicketStatus,
} from '@shared/types'
import type {
  CreateTicketInput as ArchitectureCreateTicketInput,
  QueueStats,
  Room as ArchitectureRoom,
  ServiceType as ArchitectureServiceType,
  Ticket as ArchitectureTicket,
  TicketPriority as ArchitectureTicketPriority,
} from '../../../types'
import type {
  QueueOverloadRoom,
  TicketSettingsPayload,
  TicketSettingsServiceTypeOption,
} from '../types'

const sharedServiceTypeByArchitectureId: Record<string, SharedServiceType> = {
  '1': 'consultation',
  '2': 'billing',
  '3': 'diagnostics',
  '4': 'laboratory',
  '5': 'registration',
}

const architectureCodeByServiceType: Record<SharedServiceType, ArchitectureServiceType['code']> = {
  billing: 'consultation',
  consultation: 'consultation',
  diagnostics: 'xray',
  laboratory: 'analysis',
  pharmacy: 'consultation',
  registration: 'consultation',
}

const sharedServiceTypeByArchitectureCode: Record<
  ArchitectureServiceType['code'],
  SharedServiceType
> = {
  analysis: 'laboratory',
  consultation: 'consultation',
  xray: 'diagnostics',
}

const sharedPriorityByArchitecturePriority: Record<
  ArchitectureTicketPriority,
  SharedTicketPriority
> = {
  high: 'high',
  low: 'low',
  normal: 'normal',
}

const architecturePriorityBySharedPriority: Record<
  SharedTicketPriority,
  ArchitectureTicketPriority
> = {
  critical: 'high',
  high: 'high',
  low: 'low',
  normal: 'normal',
}

const priorityWeight: Record<SharedTicketPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

const serviceTypeOptions: TicketSettingsServiceTypeOption[] = [
  'registration',
  'consultation',
  'diagnostics',
  'laboratory',
  'pharmacy',
  'billing',
].map((serviceType) => ({
  code: serviceType as SharedServiceType,
  id: Object.entries(sharedServiceTypeByArchitectureId).find(([, value]) => value === serviceType)?.[0] ?? serviceType,
  name: getServiceTypeLabel(serviceType as SharedServiceType),
}))

let queueSnapshot = createInitialQueueSnapshot()

function clone<T>(value: T): T {
  return structuredClone(value)
}

function findSharedTicket(id: string): SharedTicket {
  const ticket = queueSnapshot.tickets.find((item) => item.id === id)

  if (!ticket) {
    throw new Error(`Ticket ${id} was not found.`)
  }

  return ticket
}

function findRoom(roomId?: string): SharedRoom | undefined {
  return queueSnapshot.rooms.find((room) => room.id === roomId)
}

function refreshQueueSnapshot(): void {
  queueSnapshot.rooms = queueSnapshot.rooms.map((room) => {
    const currentTicket = queueSnapshot.tickets.find(
      (ticket) => ticket.roomId === room.id && ['called', 'in_service'].includes(ticket.status),
    )
    const waitingCount = queueSnapshot.tickets.filter(
      (ticket) => ticket.status === 'waiting' && (!ticket.roomId || ticket.roomId === room.id),
    ).length
    const loadPercent = Math.min(100, Math.max(room.workload ?? 0, waitingCount * 12 + (currentTicket ? 30 : 0)))

    return {
      ...room,
      currentTicketId: currentTicket?.id,
      loadPercent,
      status: currentTicket ? 'busy' : room.status === 'paused' ? 'paused' : 'open',
      workload: loadPercent,
    }
  })
  queueSnapshot.kpi = calculateQueueKpi(queueSnapshot.tickets, queueSnapshot.rooms)
}

function pushEvent(ticket: SharedTicket, status: SharedTicketStatus): void {
  const eventTypeByStatus = {
    called: 'ticket_called',
    completed: 'service_completed',
    in_service: 'service_started',
  } as const
  const eventType = status in eventTypeByStatus
    ? eventTypeByStatus[status as keyof typeof eventTypeByStatus]
    : 'ticket_created'

  queueSnapshot.events = [
    createQueueEvent(eventType, `${ticket.number} changed to ${status}`, {
      roomId: ticket.roomId,
      ticketId: ticket.id,
      ticketNumber: ticket.number,
    }),
    ...queueSnapshot.events,
  ].slice(0, 20)
}

function toArchitectureServiceType(serviceType: SharedServiceType): ArchitectureServiceType {
  return {
    code: architectureCodeByServiceType[serviceType],
    id: String(Object.entries(sharedServiceTypeByArchitectureId).find(([, value]) => value === serviceType)?.[0] ?? 1),
    name: getServiceTypeLabel(serviceType),
  }
}

export function toArchitectureRoom(room?: SharedRoom): ArchitectureRoom {
  return {
    id: room?.id ?? 'room-unassigned',
    name: room?.name ?? 'Unassigned',
    serviceTypes: [toArchitectureServiceType('consultation')],
  }
}

export function toArchitectureTicket(ticket: SharedTicket): ArchitectureTicket {
  return {
    eta: ticket.etaMinutes,
    id: ticket.id,
    number: ticket.number,
    priority: architecturePriorityBySharedPriority[ticket.priority],
    room: toArchitectureRoom(findRoom(ticket.roomId)),
    serviceType: toArchitectureServiceType(ticket.serviceType),
    status: ticket.status,
  }
}

export function toArchitectureTickets(tickets: SharedTicket[]): ArchitectureTicket[] {
  return tickets.map(toArchitectureTicket)
}

function toSharedTicket(ticket: ArchitectureTicket): SharedTicket {
  return {
    createdAt: new Date().toISOString(),
    etaMinutes: ticket.eta,
    id: ticket.id,
    number: ticket.number,
    patientName: `Patient ${ticket.number}`,
    priority: sharedPriorityByArchitecturePriority[ticket.priority],
    roomId: ticket.room.id,
    serviceType: sharedServiceTypeByArchitectureCode[ticket.serviceType.code],
    status: ticket.status,
  }
}

export function getQueueSnapshot(): QueueSnapshot {
  refreshQueueSnapshot()

  return clone(queueSnapshot)
}

export function getArchitectureTickets(): ArchitectureTicket[] {
  return toArchitectureTickets(getQueueSnapshot().tickets)
}

export function getArchitectureTicketById(id: string): ArchitectureTicket | undefined {
  return getArchitectureTickets().find((ticket) => ticket.id === id)
}

export function createSharedTicket(input: SharedTicketCreateInput): SharedTicket {
  const ticket = createMockTicket(input, queueSnapshot.tickets.length)

  queueSnapshot.tickets = [ticket, ...queueSnapshot.tickets]
  pushEvent(ticket, 'created')
  refreshQueueSnapshot()

  return clone(ticket)
}

export function createArchitectureTicket(input: ArchitectureCreateTicketInput): ArchitectureTicket {
  const serviceType = sharedServiceTypeByArchitectureId[String(input.serviceTypeId)] ?? 'consultation'
  const ticket = createSharedTicket({
    patientName: `Patient ${Date.now().toString().slice(-4)}`,
    priority: sharedPriorityByArchitecturePriority[input.priority],
    serviceType,
  })

  return toArchitectureTicket(ticket)
}

export function getMockServiceTypeOptions(): TicketSettingsServiceTypeOption[] {
  return clone(serviceTypeOptions)
}

export function updateSharedTicketStatus(
  id: string,
  status: SharedTicketStatus,
  roomId?: string | number,
): SharedTicket {
  const ticket = findSharedTicket(id)
  const now = new Date().toISOString()

  ticket.status = status

  if (roomId) {
    ticket.roomId = String(roomId)
  }

  if (status === 'waiting') {
    ticket.calledAt = undefined
    ticket.startedAt = undefined
    ticket.completedAt = undefined
  }

  if (status === 'called') {
    ticket.calledAt = now
    ticket.roomId = ticket.roomId ?? queueSnapshot.rooms.find((room) => room.status !== 'paused')?.id
  }

  if (status === 'in_service') {
    ticket.startedAt = now
  }

  if (['cancelled', 'completed', 'no_show'].includes(status)) {
    ticket.completedAt = now
  }

  pushEvent(ticket, status)
  refreshQueueSnapshot()

  return clone(ticket)
}

export function redirectSharedTicket(id: string, newRoomId: string | number): SharedTicket {
  const ticket = findSharedTicket(id)

  ticket.status = 'redirected'
  ticket.roomId = String(newRoomId)
  pushEvent(ticket, 'redirected')
  refreshQueueSnapshot()

  return clone(ticket)
}

export function updateSharedTicketSettings(id: string, payload: TicketSettingsPayload): SharedTicket {
  const ticket = findSharedTicket(id)

  if (payload.serviceType) {
    ticket.serviceType = payload.serviceType
  } else if (payload.serviceTypeId) {
    ticket.serviceType = sharedServiceTypeByArchitectureId[String(payload.serviceTypeId)] ?? ticket.serviceType
  }

  if (payload.roomId !== undefined) {
    ticket.roomId = payload.roomId ? String(payload.roomId) : undefined
  }

  if (payload.doctorId !== undefined) {
    ticket.assignedTo = payload.doctorId ? String(payload.doctorId) : undefined
  }

  if (payload.priority) {
    ticket.priority = payload.priority
  }

  if (payload.comment !== undefined) {
    ticket.notes = payload.comment.trim() || undefined
  }

  if (payload.etaMinutes !== undefined) {
    ticket.etaMinutes = Math.max(0, Math.round(payload.etaMinutes))
  }

  if (payload.status) {
    const updatedTicket = updateSharedTicketStatus(id, payload.status)

    return {
      ...updatedTicket,
      serviceType: ticket.serviceType,
      roomId: ticket.roomId,
      assignedTo: ticket.assignedTo,
      priority: ticket.priority,
      notes: ticket.notes,
      etaMinutes: ticket.etaMinutes,
    }
  }

  refreshQueueSnapshot()

  return clone(ticket)
}

export function getNextSharedTicket(roomId?: string | number): SharedTicket | undefined {
  const resolvedRoomId = roomId ? String(roomId) : undefined
  const candidates = queueSnapshot.tickets
    .filter((ticket) => ['created', 'waiting'].includes(ticket.status))
    .filter((ticket) => !resolvedRoomId || !ticket.roomId || ticket.roomId === resolvedRoomId)
    .sort((first, second) => {
      const priorityDelta = priorityWeight[second.priority] - priorityWeight[first.priority]

      if (priorityDelta !== 0) {
        return priorityDelta
      }

      return Date.parse(first.createdAt) - Date.parse(second.createdAt)
    })

  return candidates[0] ? clone(candidates[0]) : undefined
}

export function callNextSharedTicket(roomId: string | number): SharedTicket | undefined {
  const nextTicket = getNextSharedTicket(roomId)

  return nextTicket ? updateSharedTicketStatus(nextTicket.id, 'called', roomId) : undefined
}

export function getQueueStats(): QueueStats {
  const snapshot = getQueueSnapshot()

  return {
    activeTickets: snapshot.kpi.activeTickets,
    averageWaitMinutes: snapshot.kpi.averageWaitMinutes,
    completedToday: snapshot.kpi.completedToday,
    overloadedRooms: snapshot.kpi.overloadedRooms,
  }
}

export function getOverloadRooms(): QueueOverloadRoom[] {
  return getQueueSnapshot()
    .rooms
    .filter((room) => room.loadPercent >= 75)
    .map((room) => ({
      queueCount: queueSnapshot.tickets.filter((ticket) => ticket.roomId === room.id).length,
      roomId: room.id,
      roomName: room.name,
    }))
}

export function getArchitectureRooms(): ArchitectureRoom[] {
  return getQueueSnapshot().rooms.map(toArchitectureRoom)
}

export function getArchitectureQueueByRoom(roomId: string | number): ArchitectureTicket[] {
  return toArchitectureTickets(
    getQueueSnapshot().tickets.filter((ticket) => ticket.roomId === String(roomId)),
  )
}

export function getHighPriorityArchitectureTickets(): ArchitectureTicket[] {
  return toArchitectureTickets(
    getQueueSnapshot().tickets.filter((ticket) =>
      ['critical', 'high'].includes(ticket.priority) && ['created', 'waiting'].includes(ticket.status),
    ),
  )
}

export function replaceArchitectureQueue(nextTickets: ArchitectureTicket[]): void {
  queueSnapshot.tickets = nextTickets.map(toSharedTicket)
  refreshQueueSnapshot()
}
