export type TicketStatus =
  | 'waiting'
  | 'called'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type TicketPriority = 'low' | 'normal' | 'high'

export type UserRole = 'admin' | 'manager' | 'specialist'

export interface ServiceType {
  id: string
  code: 'consultation' | 'xray' | 'analysis'
  name: string
}

export interface Room {
  id: string
  name: string
  serviceTypes: ServiceType[]
}

export interface Ticket {
  id: string
  number: string
  serviceType: ServiceType
  status: TicketStatus
  room: Room
  priority: TicketPriority
  eta: number
}

export interface User {
  id: string
  name: string
  role: UserRole
}

export type CreateTicketInput = {
  serviceTypeId: string
  priority: TicketPriority
}

export type UpdateTicketStatusInput = {
  ticketId: string
  status: TicketStatus
}
