import type {
  QueueKpi,
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
  id: number | string
  name: string
  isActive?: boolean
}

export type BackendTicket = {
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
  consultation: 'consultation',
  other: 'registration',
  payment: 'billing',
  xray: 'diagnostics',
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

function getBackendServiceName(ticket: BackendTicket): string {
  return ticket.serviceType?.name ?? ''
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

  if (priority >= 3) {
    return 'high'
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
    roomId: toId(ticket.roomId ?? ticket.room?.id) || undefined,
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
  const room: ArchitectureRoom = {
    id: toId(ticket.roomId ?? ticket.room?.id),
    name: ticket.room?.name ?? 'Не назначен',
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
): Room[] {
  const rooms = new Map<string, Room>()

  stats.forEach((stat) => {
    const id = toId(stat.roomId)

    rooms.set(id, {
      id,
      name: stat.roomName,
      department: stat.roomName,
      specialistName: stat.roomName,
      status: 'open',
      loadPercent: Math.min(100, Math.max(0, stat.activeTickets * 10)),
      workload: Math.min(100, Math.max(0, stat.activeTickets * 10)),
    })
  })

  tickets.forEach((ticket) => {
    const roomId = toId(ticket.roomId ?? ticket.room?.id)

    if (!roomId || rooms.has(roomId)) {
      return
    }

    const serviceType = toSharedServiceType(ticket)

    rooms.set(roomId, {
      id: roomId,
      name: ticket.room?.name ?? `Кабинет ${roomId}`,
      department: serviceType,
      specialistName: ticket.room?.name ?? `Кабинет ${roomId}`,
      status: ticket.room?.isActive === false ? 'paused' : 'open',
      loadPercent: 0,
      workload: 0,
    })
  })

  return Array.from(rooms.values()).map((room) => {
    const currentTicket = tickets.find((ticket) => {
      const ticketRoomId = toId(ticket.roomId ?? ticket.room?.id)

      return ticketRoomId === room.id && ['called', 'in_service'].includes(ticket.status)
    })

    return {
      ...room,
      currentTicketId: currentTicket ? toId(currentTicket.id) : undefined,
      status: currentTicket ? 'busy' : room.status,
    }
  })
}

export function toQueueKpi(
  tickets: BackendTicket[],
  stats: BackendQueueStats[] = [],
  overload: BackendOverloadRoom[] = [],
): QueueKpi {
  const activeTickets = tickets.filter((ticket) =>
    ['created', 'waiting', 'called', 'in_service'].includes(ticket.status),
  ).length
  const totalEta = stats.reduce((sum, item) => sum + item.etaMinutes, 0)

  return {
    activeTickets,
    averageWaitMinutes: stats.length > 0 ? Math.round(totalEta / stats.length) : 0,
    completedToday: tickets.filter((ticket) => ticket.status === 'completed').length,
    overloadedRooms: overload.length,
  }
}

export function toQueueSnapshot(
  tickets: BackendTicket[],
  stats: BackendQueueStats[] = [],
  overload: BackendOverloadRoom[] = [],
): QueueSnapshot {
  return {
    tickets: toSharedTickets(tickets),
    rooms: toSharedRooms(tickets, stats),
    events: [],
    recommendations: [],
    analytics: [],
    kpi: toQueueKpi(tickets, stats, overload),
  }
}
