import type { Room, Ticket } from '@shared/types'
import { formatTime } from '@shared/utils'

type CallBoardProps = {
  rooms: Room[]
  tickets: Ticket[]
}

function getCallTime(ticket: Ticket): string {
  return ticket.calledAt ?? ticket.updatedAt ?? ticket.createdAt
}

function getCallTimestamp(ticket: Ticket): number {
  const timestamp = Date.parse(getCallTime(ticket))

  return Number.isFinite(timestamp) ? timestamp : 0
}

function getRoomName(ticket: Ticket, rooms: Room[]): string {
  if (ticket.roomName) {
    return ticket.roomName
  }

  const room = rooms.find((item) => item.id === ticket.roomId)

  return room?.name ?? (ticket.roomId ? `Кабинет ${ticket.roomId}` : 'Кабинет не назначен')
}

export function CallBoard({ rooms, tickets }: CallBoardProps) {
  const calledTickets = tickets
    .filter((ticket) => ticket.status === 'called' || ticket.status === 'in_service' || ticket.status === 'completed')
    .sort((left, right) => getCallTimestamp(right) - getCallTimestamp(left))
    .slice(0, 10)
  const currentCall = calledTickets[0]
  const recentCalls = calledTickets.slice(1)

  return (
    <div className="tv-grid">
      <section className="tv-current">
        <span className="tv-section-label">Сейчас вызывается</span>
        {currentCall ? (
          <article className="tv-call-card tv-call-featured">
            <strong>{currentCall.number}</strong>
            <span>{getRoomName(currentCall, rooms)}</span>
            <time>{formatTime(getCallTime(currentCall))}</time>
          </article>
        ) : (
          <div className="tv-empty-call">Ожидайте вызова</div>
        )}
      </section>

      <section className="tv-recent">
        <span className="tv-section-label">Последние вызовы</span>
        {recentCalls.length > 0 ? (
          recentCalls.map((ticket) => (
            <div className="tv-recent-row" key={ticket.id}>
              <strong>{ticket.number}</strong>
              <span>{getRoomName(ticket, rooms)}</span>
              <time>{formatTime(getCallTime(ticket))}</time>
            </div>
          ))
        ) : (
          <div className="tv-empty-recent">Ожидайте вызова</div>
        )}
      </section>
    </div>
  )
}