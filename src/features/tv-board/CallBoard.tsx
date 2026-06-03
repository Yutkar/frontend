import type { Room, Ticket } from '@shared/types'
import {
  formatTime,
  getServiceTypeLabel,
  getTicketStatusMeta,
} from '@shared/utils'

type CallBoardProps = {
  rooms: Room[]
  tickets: Ticket[]
}

export function CallBoard({ rooms, tickets }: CallBoardProps) {
  const activeCalls = tickets
    .filter((ticket) => ['called', 'in_service'].includes(ticket.status) || Boolean(ticket.calledAt))
    .sort((left, right) => (
      new Date(right.calledAt ?? right.createdAt).getTime() -
      new Date(left.calledAt ?? left.createdAt).getTime()
    ))
  const currentCall = activeCalls[0]
  const secondaryCalls = activeCalls.slice(1, 5)
  const recentCalls = tickets
    .filter((ticket) => ticket.calledAt)
    .sort((left, right) => new Date(right.calledAt ?? '').getTime() - new Date(left.calledAt ?? '').getTime())
    .slice(0, 6)

  return (
    <div className="tv-grid">
      <section className="tv-current">
        <span className="tv-section-label">Сейчас вызывается</span>
        {currentCall ? (
          <TvCallCard featured rooms={rooms} ticket={currentCall} />
        ) : (
          <div className="tv-empty-call">Ожидайте вызова</div>
        )}

        {secondaryCalls.map((ticket) => (
          <TvCallCard key={ticket.id} rooms={rooms} ticket={ticket} />
        ))}
      </section>

      <section className="tv-recent">
        <span className="tv-section-label">Последние вызовы</span>
        {recentCalls.length > 0 ? (
          recentCalls.map((ticket) => {
            const room = rooms.find((item) => item.id === ticket.roomId)

            return (
              <div className="tv-recent-row" key={ticket.id}>
                <strong>{ticket.number}</strong>
                <span>{room?.name ?? 'Кабинет не назначен'}</span>
                <small>{getServiceTypeLabel(ticket.serviceType)}</small>
                <time>{ticket.calledAt ? formatTime(ticket.calledAt) : '-'}</time>
              </div>
            )
          })
        ) : (
          <div className="tv-empty-recent">Последних вызовов нет</div>
        )}
      </section>
    </div>
  )
}

function TvCallCard({
  featured = false,
  rooms,
  ticket,
}: {
  featured?: boolean
  rooms: Room[]
  ticket: Ticket
}) {
  const room = rooms.find((item) => item.id === ticket.roomId)
  const status = getTicketStatusMeta(ticket.status).label

  return (
    <article className={`tv-call-card ${featured ? 'tv-call-featured' : ''}`}>
      <span className="tv-card-kicker">Талон</span>
      <strong>{ticket.number}</strong>
      <dl>
        <div>
          <dt>Кабинет</dt>
          <dd>{room?.name ?? 'Кабинет не назначен'}</dd>
        </div>
        <div>
          <dt>Услуга</dt>
          <dd>{getServiceTypeLabel(ticket.serviceType)}</dd>
        </div>
        <div>
          <dt>Статус</dt>
          <dd>{status}</dd>
        </div>
        {ticket.calledAt ? (
          <div>
            <dt>Время вызова</dt>
            <dd>{formatTime(ticket.calledAt)}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  )
}
