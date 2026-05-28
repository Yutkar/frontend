import type { TicketStatus } from '../types'

const statusLabels: Record<TicketStatus, string> = {
  waiting: 'Ожидает',
  called: 'Вызван',
  in_service: 'В обслуживании',
  completed: 'Завершён',
  cancelled: 'Отменён',
  no_show: 'Не явился',
}

type StatusBadgeProps = {
  status: TicketStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`architecture-status architecture-status-${status}`}>{statusLabels[status]}</span>
}
