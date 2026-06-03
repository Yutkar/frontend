export type TicketStatus =
  | 'created'
  | 'waiting'
  | 'called'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'redirected'

export type TicketPriority = 'low' | 'normal' | 'above_normal' | 'high' | 'critical'

export type ServiceType =
  | 'registration'
  | 'consultation'
  | 'diagnostics'
  | 'laboratory'
  | 'pharmacy'
  | 'billing'

export type RoomStatus = 'open' | 'busy' | 'paused'

export type Ticket = {
  id: string
  number: string
  patientName: string
  serviceType: ServiceType
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  calledAt?: string
  startedAt?: string
  completedAt?: string
  roomId?: string
  assignedTo?: string
  etaMinutes: number
  notes?: string
}

export type Room = {
  id: string
  name: string
  department: string
  specialistName: string
  status: RoomStatus
  isActive?: boolean
  currentTicketId?: string
  workload?: number
  loadPercent: number
}

export type QueueEventType =
  | 'ticket_created'
  | 'ticket_called'
  | 'service_started'
  | 'service_completed'
  | 'queue_overloaded'

export type QueueEvent = {
  id: string
  type: QueueEventType
  ticketId?: string
  ticketNumber?: string
  roomId?: string
  specialistId?: string
  occurredAt: string
  message: string
}

export type QueueRecommendation = {
  id: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  action: string
  isResolved?: boolean
  relatedRoomId?: string
  relatedRoomName?: string
  ticketId?: string
  ticket?: Ticket
  createdAt: string
}

export type AnalyticsPoint = {
  label: string
  waiting: number
  completed: number
  avgWaitMinutes: number
}

export type QueueKpi = {
  activeTickets: number
  averageWaitMinutes: number
  completedToday: number
  overloadedRooms: number
}

export type QueueSnapshot = {
  tickets: Ticket[]
  rooms: Room[]
  events: QueueEvent[]
  recommendations: QueueRecommendation[]
  analytics: AnalyticsPoint[]
  kpi: QueueKpi
}

export type TicketCreateInput = {
  patientName: string
  serviceType: ServiceType
  priority: TicketPriority
  roomId?: string | number
  notes?: string
}

export type RedirectTicketInput = {
  ticketId: string
  roomId: string
  reason: string
}
