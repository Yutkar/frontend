import type {
  QueueKpi,
  QueueRecommendation,
  QueueSnapshot,
  Room,
  ServiceType,
  Ticket,
  TicketCreateInput,
  TicketPriority,
  TicketStatus,
} from '@shared/types'
import type {
  Room as ArchitectureRoom,
  ServiceType as ArchitectureServiceType,
  Ticket as ArchitectureTicket,
  TicketPriority as ArchitectureTicketPriority,
  TicketStatus as ArchitectureTicketStatus,
} from '../../types'

export type BackendTicketStatus =
  | 'created'
  | 'waiting'
  | 'called'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'redirected'

export type BackendServiceType = {
  id: number | string
  name: string
  averageDurationMinutes?: number
  priorityWeight?: number
}

export type BackendRoom = {
  _id?: number | string
  active?: boolean
  id?: number | string
  isActive?: boolean
  name?: string
  roomId?: number | string
  roomName?: string
  services?: unknown[]
  serviceTypeIds?: Array<number | string>
  serviceTypes?: unknown[]
  status?: string
  title?: string
}

export type BackendTicket = {
  assignedRoom?: BackendRoom | null
  assignedRoomId?: number | string | null
  id: number | string
  number: string
  priority?: number
  status: BackendTicketStatus
  etaMinutes?: number | null
  serviceTypeId?: number | string
  roomId?: number | string | null
  createdAt?: string
  calledAt?: string | null
  serviceStartedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  serviceType?: BackendServiceType
  room?: BackendRoom | null
  roomName?: string | null
}

export type BackendQueueStats = {
  roomId: number | string
  roomName: string
  activeTickets: number
  avgServiceMinutes: number
  etaMinutes: number
}

export type BackendOverloadRoom = {
  roomId: number | string
  roomName: string
  queueCount: number
}

export type BackendRecommendation = {
  _id?: number | string
  action?: string
  createdAt?: string
  description?: string
  id?: number | string
  isRead?: boolean
  level?: string
  message?: string
  read?: boolean
  relatedRoomId?: number | string
  resolved?: boolean
  roomId?: number | string
  severity?: string
  text?: string
  title?: string
}

const serviceTypeByBackendId: Record<number, ServiceType> = {
  1: 'consultation',
  2: 'billing',
  3: 'diagnostics',
  4: 'laboratory',
  5: 'registration',
}

const backendIdByServiceType: Record<ServiceType, number> = {
  billing: 2,
  consultation: 1,
  diagnostics: 3,
  laboratory: 4,
  pharmacy: 5,
  registration: 5,
}

const serviceTypeByBackendName: Record<string, ServiceType> = {
  analysis: 'laboratory',
  billing: 'billing',
  consultation: 'consultation',
  diagnostics: 'diagnostics',
  laboratory: 'laboratory',
  other: 'registration',
  payment: 'billing',
  pharmacy: 'pharmacy',
  registration: 'registration',
  xray: 'diagnostics',
  анализы: 'laboratory',
  аптека: 'pharmacy',
  диагностика: 'diagnostics',
  другое: 'registration',
  консультация: 'consultation',
  лаборатория: 'laboratory',
  оплата: 'billing',
  регистрация: 'registration',
  рентген: 'diagnostics',
}

const architectureServiceByBackendName: Record<string, ArchitectureServiceType['code']> = {
  analysis: 'analysis',
  consultation: 'consultation',
  other: 'consultation',
  payment: 'consultation',
  xray: 'xray',
}

function toId(value?: number | string | null): string {
  return value == null ? '' : String(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getRecordString(record: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number') {
      return String(value)
    }
  }

  return fallback
}

function getRecordBoolean(record: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'boolean') {
      return value
    }
  }

  return undefined
}

function getBackendRoomId(room?: BackendRoom | null): string {
  return toId(room?.id ?? room?.roomId ?? room?._id)
}

function getBackendRoomName(room?: BackendRoom | null): string {
  return room?.name ?? room?.title ?? room?.roomName ?? 'Кабинет без названия'
}

export function getBackendTicketRoomId(ticket: BackendTicket): string {
  const roomId = toId(ticket.roomId)

  if (roomId) {
    return roomId
  }

  const nestedRoomId = getBackendRoomId(ticket.room)

  if (nestedRoomId) {
    return nestedRoomId
  }

  const assignedRoomId = toId(ticket.assignedRoomId)

  if (assignedRoomId) {
    return assignedRoomId
  }

  return getBackendRoomId(ticket.assignedRoom)
}

function getBackendTicketRoomName(ticket: BackendTicket): string {
  const nestedRoomName = ticket.room?.name ?? ticket.room?.title ?? ticket.room?.roomName

  if (nestedRoomName) {
    return nestedRoomName
  }

  const roomName = ticket.roomName?.trim()

  if (roomName) {
    return roomName
  }

  const assignedRoomName = ticket.assignedRoom?.name
    ?? ticket.assignedRoom?.title
    ?? ticket.assignedRoom?.roomName

  if (assignedRoomName) {
    return assignedRoomName
  }

  const roomId = getBackendTicketRoomId(ticket)

  return roomId ? `Кабинет ${roomId}` : 'Не назначен'
}

function getBackendRoomActive(room?: BackendRoom | null): boolean {
  if (!room) {
    return true
  }

  if (typeof room.isActive === 'boolean') {
    return room.isActive
  }

  if (typeof room.active === 'boolean') {
    return room.active
  }

  return room.status !== 'paused' && room.status !== 'inactive' && room.status !== 'deleted'
}

export function toBackendRooms(value: unknown): BackendRoom[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord) as BackendRoom[]
  }

  if (!isRecord(value)) {
    return []
  }

  if (Array.isArray(value.rooms)) {
    return value.rooms.filter(isRecord) as BackendRoom[]
  }

  if (Array.isArray(value.data)) {
    return value.data.filter(isRecord) as BackendRoom[]
  }

  if (isRecord(value.data)) {
    return toBackendRooms(value.data)
  }

  return []
}

function getBackendServiceName(ticket: BackendTicket): string {
  return ticket.serviceType?.name?.trim().toLowerCase() ?? ''
}

export function toBackendServiceTypeId(serviceType: ServiceType): number {
  return backendIdByServiceType[serviceType]
}

export function toBackendPriority(priority?: TicketPriority | ArchitectureTicketPriority): number {
  if (priority === 'low') {
    return 1
  }

  if (priority === 'high') {
    return 4
  }

  if (priority === 'above_normal') {
    return 3
  }

  if (priority === 'critical') {
    return 5
  }

  return 2
}

export function toSharedPriority(priority = 2): TicketPriority {
  if (priority <= 1) {
    return 'low'
  }

  if (priority >= 5) {
    return 'critical'
  }

  if (priority >= 4) {
    return 'high'
  }

  if (priority >= 3) {
    return 'above_normal'
  }

  return 'normal'
}

export function toArchitecturePriority(priority = 2): ArchitectureTicketPriority {
  if (priority <= 1) {
    return 'low'
  }

  if (priority >= 3) {
    return 'high'
  }

  return 'normal'
}

export function toSharedStatus(status: BackendTicketStatus): TicketStatus {
  return status
}

export function toArchitectureStatus(status: BackendTicketStatus): ArchitectureTicketStatus {
  return status
}

export function toSharedServiceType(ticket: BackendTicket): ServiceType {
  const backendName = getBackendServiceName(ticket)

  if (backendName && serviceTypeByBackendName[backendName]) {
    return serviceTypeByBackendName[backendName]
  }

  const serviceTypeId = Number(ticket.serviceTypeId ?? ticket.serviceType?.id)

  return serviceTypeByBackendId[serviceTypeId] ?? 'consultation'
}

export function toSharedTicket(ticket: BackendTicket): Ticket {
  const serviceType = toSharedServiceType(ticket)
  const roomId = getBackendTicketRoomId(ticket)

  return {
    id: toId(ticket.id),
    number: ticket.number,
    patientName: `Пациент ${ticket.number}`,
    serviceType,
    priority: toSharedPriority(ticket.priority),
    status: toSharedStatus(ticket.status),
    createdAt: ticket.createdAt ?? new Date().toISOString(),
    calledAt: ticket.calledAt ?? undefined,
    startedAt: ticket.serviceStartedAt ?? ticket.startedAt ?? undefined,
    completedAt: ticket.completedAt ?? undefined,
    roomId: roomId || undefined,
    etaMinutes: ticket.etaMinutes ?? 0,
  }
}

export function toSharedTickets(tickets: BackendTicket[]): Ticket[] {
  return tickets.map(toSharedTicket)
}

export function toArchitectureTicket(ticket: BackendTicket): ArchitectureTicket {
  const serviceName = getBackendServiceName(ticket)
  const code = architectureServiceByBackendName[serviceName] ?? 'consultation'
  const serviceType: ArchitectureServiceType = {
    id: toId(ticket.serviceTypeId ?? ticket.serviceType?.id),
    code,
    name: serviceName || code,
  }
  const roomId = getBackendTicketRoomId(ticket)
  const room: ArchitectureRoom = {
    id: roomId,
    name: getBackendTicketRoomName(ticket),
    serviceTypes: [serviceType],
  }

  return {
    id: toId(ticket.id),
    number: ticket.number,
    serviceType,
    status: toArchitectureStatus(ticket.status),
    room,
    priority: toArchitecturePriority(ticket.priority),
    eta: ticket.etaMinutes ?? 0,
  }
}

export function toArchitectureTickets(tickets: BackendTicket[]): ArchitectureTicket[] {
  return tickets.map(toArchitectureTicket)
}

export function toArchitectureRooms(rooms: BackendRoom[]): ArchitectureRoom[] {
  return rooms
    .filter(getBackendRoomActive)
    .map((room) => ({
      id: getBackendRoomId(room),
      name: getBackendRoomName(room),
      serviceTypes: [],
    }))
    .filter((room) => room.id)
}

export function toBackendTicketCreateInput(input: TicketCreateInput): {
  priority: number
  serviceTypeId: number
} {
  return {
    priority: toBackendPriority(input.priority),
    serviceTypeId: toBackendServiceTypeId(input.serviceType),
  }
}

export function toBackendArchitectureTicketCreateInput(input: {
  priority?: ArchitectureTicketPriority
  serviceTypeId: number | string
}): {
  priority: number
  serviceTypeId: number
} {
  return {
    priority: toBackendPriority(input.priority),
    serviceTypeId: Number(input.serviceTypeId),
  }
}

export function toSharedRooms(
  tickets: BackendTicket[],
  stats: BackendQueueStats[] = [],
  backendRooms: BackendRoom[] = [],
): Room[] {
  const rooms = new Map<string, Room>()
  const hasBackendRooms = backendRooms.length > 0
  const inactiveRoomIds = new Set(
    backendRooms
      .filter((room) => !getBackendRoomActive(room))
      .map(getBackendRoomId)
      .filter(Boolean),
  )

  backendRooms.forEach((room) => {
    const id = getBackendRoomId(room)

    if (!id) {
      return
    }

    const isActive = getBackendRoomActive(room)

    rooms.set(id, {
      id,
      isActive,
      name: getBackendRoomName(room),
      department: getBackendRoomName(room),
      specialistName: getBackendRoomName(room),
      status: isActive ? 'open' : 'paused',
      loadPercent: 0,
      workload: 0,
    })
  })

  stats.forEach((stat) => {
    const id = toId(stat.roomId)

    if (!id || inactiveRoomIds.has(id)) {
      return
    }

    const existingRoom = rooms.get(id)

    if (hasBackendRooms && !existingRoom) {
      return
    }

    const workload = Math.min(100, Math.max(0, stat.activeTickets * 10))

    rooms.set(id, {
      ...existingRoom,
      id,
      isActive: existingRoom?.isActive ?? true,
      name: existingRoom?.name ?? stat.roomName,
      department: existingRoom?.department ?? stat.roomName,
      specialistName: existingRoom?.specialistName ?? stat.roomName,
      status: 'open',
      loadPercent: workload,
      workload,
    })
  })

  tickets.forEach((ticket) => {
    const roomId = getBackendTicketRoomId(ticket)

    if (!roomId || rooms.has(roomId) || inactiveRoomIds.has(roomId)) {
      return
    }

    if (hasBackendRooms) {
      return
    }

    const serviceType = toSharedServiceType(ticket)
    const roomName = getBackendTicketRoomName(ticket)

    rooms.set(roomId, {
      id: roomId,
      isActive: getBackendRoomActive(ticket.room),
      name: roomName,
      department: serviceType,
      specialistName: roomName,
      status: getBackendRoomActive(ticket.room) ? 'open' : 'paused',
      loadPercent: 0,
      workload: 0,
    })
  })

  return Array.from(rooms.values()).map((room) => {
    const currentTicket = tickets.find((ticket) => {
      const ticketRoomId = getBackendTicketRoomId(ticket)

      return ticketRoomId === room.id && ['called', 'in_service'].includes(ticket.status)
    })

    return {
      ...room,
      currentTicketId: currentTicket ? toId(currentTicket.id) : undefined,
      status: currentTicket && room.isActive !== false ? 'busy' : room.status,
    }
  })
}

export function toQueueKpi(
  tickets: BackendTicket[],
  stats: BackendQueueStats[] = [],
  overload: BackendOverloadRoom[] = [],
): QueueKpi {
  const activeTickets = tickets.filter((ticket) =>
    ['created', 'waiting', 'called', 'in_service', 'redirected'].includes(ticket.status),
  ).length
  const totalEta = stats.reduce((sum, item) => sum + item.etaMinutes, 0)

  return {
    activeTickets,
    averageWaitMinutes: stats.length > 0 ? Math.round(totalEta / stats.length) : 0,
    completedToday: tickets.filter((ticket) => ticket.status === 'completed').length,
    overloadedRooms: overload.length,
  }
}

function toRecommendationSeverity(
  value?: string,
): QueueRecommendation['severity'] {
  const normalizedValue = value?.toLowerCase()

  if (normalizedValue === 'critical' || normalizedValue === 'danger' || normalizedValue === 'high') {
    return 'critical'
  }

  if (normalizedValue === 'warning' || normalizedValue === 'warn' || normalizedValue === 'medium') {
    return 'warning'
  }

  return 'info'
}

function getRecommendationId(recommendation: BackendRecommendation, index: number): string {
  return toId(recommendation.id ?? recommendation._id) || `recommendation-${index}`
}

export function toBackendRecommendations(value: unknown): BackendRecommendation[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord).map((item) => item as BackendRecommendation)
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return value.items.filter(isRecord).map((item) => item as BackendRecommendation)
  }

  if (isRecord(value) && Array.isArray(value.recommendations)) {
    return value.recommendations.filter(isRecord).map((item) => item as BackendRecommendation)
  }

  return []
}

export function toSharedRecommendations(
  recommendations: BackendRecommendation[] = [],
): QueueRecommendation[] {
  return recommendations
    .filter((recommendation) => {
      const record = recommendation as Record<string, unknown>
      const resolved = getRecordBoolean(record, ['resolved', 'isResolved'])
      const read = getRecordBoolean(record, ['read', 'isRead'])

      return resolved !== true && read !== true
    })
    .map((recommendation, index) => {
      const record = recommendation as Record<string, unknown>
      const message = getRecordString(record, ['message', 'text', 'description'], 'Новое уведомление')
      const title = getRecordString(record, ['title'], 'Уведомление')
      const description = getRecordString(record, ['description', 'message', 'text'], message)

      return {
        action: getRecordString(record, ['action'], 'Проверить очередь'),
        createdAt: getRecordString(record, ['createdAt'], new Date().toISOString()),
        description,
        id: getRecommendationId(recommendation, index),
        message,
        relatedRoomId: toId(recommendation.relatedRoomId ?? recommendation.roomId) || undefined,
        severity: toRecommendationSeverity(recommendation.severity ?? recommendation.level),
        title,
      }
    })
}

export function toQueueSnapshot(
  tickets: BackendTicket[],
  stats: BackendQueueStats[] = [],
  overload: BackendOverloadRoom[] = [],
  rooms: BackendRoom[] = [],
  recommendations: BackendRecommendation[] = [],
): QueueSnapshot {
  return {
    tickets: toSharedTickets(tickets),
    rooms: toSharedRooms(tickets, stats, rooms),
    events: [],
    recommendations: toSharedRecommendations(recommendations),
    analytics: [],
    kpi: toQueueKpi(tickets, stats, overload),
  }
}
