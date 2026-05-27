import type {
  ServiceType,
  Ticket,
  TicketPriority,
  TicketStatus,
} from '@shared/types'
import { t } from '@shared/locales/useLocale'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

type Meta = {
  label: string
  tone: Tone
}

export const ticketStatusMeta: Record<TicketStatus, Meta> = {
  waiting: { label: t.status.waiting, tone: 'neutral' },
  called: { label: t.status.called, tone: 'info' },
  in_service: { label: t.status.in_service, tone: 'success' },
  completed: { label: t.status.completed, tone: 'success' },
  redirected: { label: t.status.redirected, tone: 'warning' },
  cancelled: { label: t.status.cancelled, tone: 'danger' },
  no_show: { label: t.status.no_show, tone: 'danger' },
}

export const priorityMeta: Record<TicketPriority, Meta> = {
  low: { label: t.priority.low, tone: 'neutral' },
  normal: { label: t.priority.normal, tone: 'info' },
  high: { label: t.priority.high, tone: 'warning' },
  critical: { label: t.priority.critical, tone: 'danger' },
}

export const serviceTypeLabel: Record<ServiceType, string> = {
  registration: t.serviceType.registration,
  consultation: t.serviceType.consultation,
  diagnostics: t.serviceType.diagnostics,
  laboratory: t.serviceType.laboratory,
  pharmacy: t.serviceType.pharmacy,
  billing: t.serviceType.billing,
}

export function getTicketStatusMeta(status: TicketStatus): Meta {
  return ticketStatusMeta[status]
}

export function getPriorityMeta(priority: TicketPriority): Meta {
  return priorityMeta[priority]
}

export function getServiceTypeLabel(serviceType: ServiceType): string {
  return serviceTypeLabel[serviceType]
}

export function isActiveTicket(ticket: Ticket): boolean {
  return ['waiting', 'called', 'in_service', 'redirected'].includes(ticket.status)
}

export function getWaitSeverity(minutes: number): Tone {
  if (minutes >= 45) {
    return 'danger'
  }

  if (minutes >= 25) {
    return 'warning'
  }

  return 'success'
}
