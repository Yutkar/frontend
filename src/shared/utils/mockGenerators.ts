import type {
  QueueEvent,
  QueueEventType,
  ServiceType,
  Ticket,
  TicketCreateInput,
} from '@shared/types'

const servicePrefixes: Record<ServiceType, string> = {
  registration: 'R',
  consultation: 'C',
  diagnostics: 'D',
  laboratory: 'L',
  pharmacy: 'P',
  billing: 'B',
}

export function generateTicketNumber(serviceType: ServiceType, seed = Date.now()): string {
  const suffix = String(seed).slice(-3).padStart(3, '0')

  return `${servicePrefixes[serviceType]}-${suffix}`
}

export function createMockTicket(input: TicketCreateInput, queueLength: number): Ticket {
  const createdAt = new Date().toISOString()

  return {
    id: `ticket-${Date.now()}`,
    number: generateTicketNumber(input.serviceType),
    patientName: input.patientName,
    serviceType: input.serviceType,
    priority: input.priority,
    roomId: input.roomId ? String(input.roomId) : undefined,
    status: 'waiting',
    createdAt,
    etaMinutes: Math.max(6, queueLength * 7),
    notes: input.notes,
  }
}

export function createQueueEvent(
  type: QueueEventType,
  message: string,
  payload: Pick<QueueEvent, 'ticketId' | 'ticketNumber' | 'roomId' | 'specialistId'> = {},
): QueueEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    message,
    occurredAt: new Date().toISOString(),
    ...payload,
  }
}
