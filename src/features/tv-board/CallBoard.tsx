import type { Room, Ticket } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatTime, getServiceTypeLabel } from '@shared/utils'

type CallBoardProps = {
  rooms: Room[]
  tickets: Ticket[]
}

export function CallBoard({ rooms, tickets }: CallBoardProps) {
  const activeCalls = tickets.filter((ticket) =>
    ['called', 'in_service', 'redirected'].includes(ticket.status),
  )
  const recentCalls = tickets
    .filter((ticket) => ticket.calledAt)
    .sort((left, right) => new Date(right.calledAt ?? '').getTime() - new Date(left.calledAt ?? '').getTime())
    .slice(0, 6)

  return (
    <div className="tv-grid">
      <section className="tv-current">
        <span className="eyebrow">{t.queue.currentCalls}</span>
        {activeCalls.map((ticket) => {
          const room = rooms.find((item) => item.id === ticket.roomId)

          return (
            <article className="tv-call-card" key={ticket.id}>
              <strong>{ticket.number}</strong>
              <span>{room?.name ?? t.queue.routing}</span>
              <small>{getServiceTypeLabel(ticket.serviceType)}</small>
            </article>
          )
        })}
      </section>

      <section className="tv-recent">
        <span className="eyebrow">{t.queue.recentCalls}</span>
        {recentCalls.map((ticket) => {
          const room = rooms.find((item) => item.id === ticket.roomId)

          return (
            <div className="tv-recent-row" key={ticket.id}>
              <strong>{ticket.number}</strong>
              <span>{room?.name ?? '-'}</span>
              <time>{ticket.calledAt ? formatTime(ticket.calledAt) : '-'}</time>
            </div>
          )
        })}
      </section>
    </div>
  )
}
