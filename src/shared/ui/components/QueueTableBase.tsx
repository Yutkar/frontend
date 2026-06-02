import type { ReactNode } from 'react'
import type { Room, Ticket } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatEta, getServiceTypeLabel } from '@shared/utils'
import { StatusBadge } from './StatusBadge'

type QueueTableBaseProps = {
  tickets: Ticket[]
  rooms: Room[]
  actionSlot?: (ticket: Ticket) => ReactNode
  emptyTitle?: string
  onSelectTicket?: (ticket: Ticket) => void
}

export function QueueTableBase({
  actionSlot,
  emptyTitle = t.queue.emptyTitle,
  onSelectTicket,
  rooms,
  tickets,
}: QueueTableBaseProps) {
  const columnCount = actionSlot ? 7 : 6

  return (
    <div className="table-shell">
      <table className="queue-table">
        <thead>
          <tr>
            <th>{t.queue.ticketNumber}</th>
            <th>{t.queue.serviceType}</th>
            <th>{t.queue.priority}</th>
            <th>{t.queue.room}</th>
            <th>{t.queue.eta}</th>
            <th>{t.queue.status}</th>
            {actionSlot ? <th>{t.queue.action}</th> : null}
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <tr>
              <td className="table-empty-cell" colSpan={columnCount}>
                <strong>{emptyTitle}</strong>
                <span>{t.queue.emptyDescription}</span>
              </td>
            </tr>
          ) : null}

          {tickets.map((ticket) => {
            const room = rooms.find((item) => item.id === ticket.roomId)

            return (
              <tr
                className={onSelectTicket ? 'interactive-row' : undefined}
                key={ticket.id}
                onClick={() => onSelectTicket?.(ticket)}
              >
                <td>
                  <strong>{ticket.number}</strong>
                </td>
                <td>{getServiceTypeLabel(ticket.serviceType)}</td>
                <td>
                  <StatusBadge priority={ticket.priority} />
                </td>
                <td>
                  {room?.name ?? '-'}
                  {room?.isActive === false || room?.status === 'paused' ? (
                    <span className="queue-room-warning">Кабинет закрыт</span>
                  ) : null}
                </td>
                <td>{formatEta(ticket.etaMinutes)}</td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                {actionSlot ? (
                  <td onClick={(event) => event.stopPropagation()}>{actionSlot(ticket)}</td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
