import type { Room, ServiceType, Ticket, User } from '../types'

export const serviceTypes: ServiceType[] = [
  { id: 'service-consultation', code: 'consultation', name: 'Консультация' },
  { id: 'service-xray', code: 'xray', name: 'Рентген' },
  { id: 'service-analysis', code: 'analysis', name: 'Анализы' },
]

export const rooms: Room[] = [
  {
    id: 'room-101',
    name: 'Кабинет 101',
    serviceTypes: [serviceTypes[0]],
  },
  {
    id: 'room-214',
    name: 'Кабинет 214',
    serviceTypes: [serviceTypes[1]],
  },
  {
    id: 'room-305',
    name: 'Лаборатория 305',
    serviceTypes: [serviceTypes[2]],
  },
]

export const users: User[] = [
  { id: 'user-admin', name: 'Администратор SmartQ', role: 'admin' },
  { id: 'user-manager', name: 'Оператор очереди', role: 'manager' },
  { id: 'user-specialist', name: 'Специалист кабинета', role: 'specialist' },
]

export let tickets: Ticket[] = [
  {
    id: 'ticket-001',
    number: 'A001',
    serviceType: serviceTypes[0],
    status: 'waiting',
    room: rooms[0],
    priority: 'normal',
    eta: 12,
  },
  {
    id: 'ticket-002',
    number: 'A002',
    serviceType: serviceTypes[1],
    status: 'called',
    room: rooms[1],
    priority: 'high',
    eta: 0,
  },
  {
    id: 'ticket-003',
    number: 'A003',
    serviceType: serviceTypes[2],
    status: 'in_service',
    room: rooms[2],
    priority: 'normal',
    eta: 0,
  },
  {
    id: 'ticket-004',
    number: 'A004',
    serviceType: serviceTypes[0],
    status: 'completed',
    room: rooms[0],
    priority: 'low',
    eta: 0,
  },
]

export function setTickets(nextTickets: Ticket[]): void {
  tickets = nextTickets
}

export function cloneData<T>(data: T): T {
  return structuredClone(data)
}
