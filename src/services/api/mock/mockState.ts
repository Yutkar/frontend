import { createInitialQueueSnapshot, calculateQueueKpi } from '@mock/queue.mock'
import { createMockTicket, createQueueEvent, getServiceTypeLabel, planRoomLoads } from '@shared/utils'
import { fallbackServiceTypeOptions } from '../serviceTypeCatalog'
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

const sharedServiceTypeByArchitectureId: Record<string, SharedServiceType> = Object.fromEntries(
  fallbackServiceTypeOptions.map((serviceType) => [String(serviceType.id), serviceType.code]),
) as Record<string, SharedServiceType>

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
  above_normal: 'high',
  critical: 'high',
  high: 'high',
  low: 'low',
  normal: 'normal',
}

const priorityWeight: Record<SharedTicketPriority, number> = {
  critical: 4,
  high: 3,
  above_normal: 2.5,
  normal: 2,
  low: 1,
}

const serviceTypeOptions: TicketSettingsServiceTypeOption[] = fallbackServiceTypeOptions

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

function isRoomAcceptingTickets(room?: SharedRoom): boolean {
  return Boolean(room && room.isActive !== false && room.status !== 'paused')
}

export function assertMockRoomAcceptsTickets(roomId?: string | number): void {
  if (!roomId) {
    return
  }

  const room = findRoom(String(roomId))

  if (!isRoomAcceptingTickets(room)) {
    throw new Error('Ticket issuance is closed for this room.')
  }
}

function getRecordText(record: Record<string, unknown>, keys: string[], fallback: string): string {
  const value = keys.map((key) => record[key]).find((item) => typeof item === 'string' && item.trim())

  return typeof value === 'string' ? value : fallback
}

function getRecordActive(record: Record<string, unknown>): boolean {
  if (typeof record.isActive === 'boolean') {
    return record.isActive
  }

  if (typeof record.active === 'boolean') {
    return record.active
  }

  return record.status !== 'paused' && record.status !== 'inactive' && record.status !== 'deleted'
}

function refreshQueueSnapshot(): void {
  const plannedQueue = planRoomLoads(queueSnapshot.rooms, queueSnapshot.tickets)

  queueSnapshot.rooms = plannedQueue.rooms
  queueSnapshot.tickets = plannedQueue.tickets
  queueSnapshot.kpi = calculateQueueKpi(queueSnapshot.tickets, queueSnapshot.rooms)
  queueSnapshot.recommendations = queueSnapshot.recommendations.map((recommendation) => {
    const ticket = recommendation.ticket
      ?? (recommendation.ticketId
        ? queueSnapshot.tickets.find((item) => item.id === recommendation.ticketId)
        : undefined)
      ?? (recommendation.relatedRoomId
        ? queueSnapshot.tickets.find((item) =>
          item.roomId === recommendation.relatedRoomId &&
          ['critical', 'high'].includes(item.priority) &&
          ['created', 'waiting', 'called', 'redirected'].includes(item.status),
        )
        : undefined)
    const roomId = recommendation.relatedRoomId ?? ticket?.roomId
    const room = roomId ? queueSnapshot.rooms.find((item) => item.id === roomId) : undefined

    return {
      ...recommendation,
      isResolved: recommendation.isResolved ?? false,
      relatedRoomId: roomId,
      relatedRoomName: recommendation.relatedRoomName ?? room?.name,
      ticket,
      ticketId: recommendation.ticketId ?? ticket?.id,
    }
  })
}

export function upsertMockQueueRoom(record: { id: string | number } & Record<string, unknown>): void {
  const id = String(record.id)
  const currentRoom = queueSnapshot.rooms.find((room) => room.id === id)
  const isActive = getRecordActive(record)
  const name = getRecordText(record, ['name', 'title', 'roomName'], currentRoom?.name ?? `Кабинет ${id}`)
  const nextRoom: SharedRoom = {
    department: getRecordText(record, ['department'], currentRoom?.department ?? name),
    id,
    isActive,
    loadPercent: currentRoom?.loadPercent ?? 0,
    name,
    serviceTypeIds: Array.isArray(record.serviceTypeIds)
      ? record.serviceTypeIds
      : currentRoom?.serviceTypeIds,
    serviceTypes: Array.isArray(record.serviceTypes)
      ? record.serviceTypes as SharedRoom['serviceTypes']
      : currentRoom?.serviceTypes,
    services: Array.isArray(record.services)
      ? record.services as SharedRoom['services']
      : currentRoom?.services,
    specialistName: currentRoom?.specialistName ?? name,
    status: isActive ? currentRoom?.status === 'busy' ? 'busy' : 'open' : 'paused',
    workload: currentRoom?.workload ?? 0,
  }

  queueSnapshot.rooms = currentRoom
    ? queueSnapshot.rooms.map((room) => (room.id === id ? { ...room, ...nextRoom } : room))
    : [...queueSnapshot.rooms, nextRoom]
  refreshQueueSnapshot()
}

export function deactivateMockQueueRoom(id: string | number): void {
  const roomId = String(id)
  const currentRoom = queueSnapshot.rooms.find((room) => room.id === roomId)

  if (!currentRoom) {
    return
  }

  queueSnapshot.rooms = queueSnapshot.rooms.map((room) => (
    room.id === roomId
      ? {
          ...room,
          currentTicketId: undefined,
          isActive: false,
          status: 'paused',
        }
      : room
  ))
  refreshQueueSnapshot()
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
    calledAt: ticket.calledAt,
    completedAt: ticket.completedAt,
    createdAt: ticket.createdAt,
    eta: ticket.etaMinutes,
    id: ticket.id,
    number: ticket.number,
    priority: architecturePriorityBySharedPriority[ticket.priority],
    room: toArchitectureRoom(findRoom(ticket.roomId)),
    serviceType: toArchitectureServiceType(ticket.serviceType),
    startedAt: ticket.startedAt,
    status: ticket.status,
  }
}

export function toArchitectureTickets(tickets: SharedTicket[]): ArchitectureTicket[] {
  return tickets.map(toArchitectureTicket)
}

function toSharedTicket(ticket: ArchitectureTicket): SharedTicket {
  return {
    calledAt: ticket.calledAt,
    completedAt: ticket.completedAt,
    createdAt: ticket.createdAt ?? new Date().toISOString(),
    etaMinutes: ticket.eta,
    id: ticket.id,
    number: ticket.number,
    patientName: `Patient ${ticket.number}`,
    priority: sharedPriorityByArchitecturePriority[ticket.priority],
    roomId: ticket.room.id,
    serviceType: sharedServiceTypeByArchitectureCode[ticket.serviceType.code],
    startedAt: ticket.startedAt,
    status: ticket.status,
  }
}

export function getQueueSnapshot(): QueueSnapshot {
  refreshQueueSnapshot()

  return clone(queueSnapshot)
}

export function resolveMockRecommendation(id: string): QueueSnapshot {
  queueSnapshot.recommendations = queueSnapshot.recommendations.filter(
    (recommendation) => recommendation.id !== id,
  )

  return getQueueSnapshot()
}

export function getArchitectureTickets(): ArchitectureTicket[] {
  return toArchitectureTickets(getQueueSnapshot().tickets)
}

export function getArchitectureTicketById(id: string): ArchitectureTicket | undefined {
  return getArchitectureTickets().find((ticket) => ticket.id === id)
}

export function createSharedTicket(input: SharedTicketCreateInput): SharedTicket {
  assertMockRoomAcceptsTickets(input.roomId)

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
    roomId: input.roomId,
    serviceType,
  })

  return toArchitectureTicket(ticket)
}

export function getMockServiceTypeOptions(): TicketSettingsServiceTypeOption[] {
  return clone(serviceTypeOptions)
}

export function getSharedServiceTypeByOptionId(id: string | number): SharedServiceType {
  return sharedServiceTypeByArchitectureId[String(id)] ?? 'consultation'
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

export function redirectSharedTicket(
  id: string,
  newRoomId: string | number,
  serviceTypeId?: string | number,
): SharedTicket {
  const ticket = findSharedTicket(id)

  ticket.status = 'redirected'
  ticket.roomId = String(newRoomId)
  if (serviceTypeId !== undefined) {
    ticket.serviceType = sharedServiceTypeByArchitectureId[String(serviceTypeId)] ?? ticket.serviceType
  }
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

  if (payload.comment !== undefined || payload.note !== undefined) {
    ticket.notes = (payload.note ?? payload.comment)?.trim() || undefined
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
    .filter((ticket) => !resolvedRoomId || ticket.roomId === resolvedRoomId)
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
