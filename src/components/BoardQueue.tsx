import type { Ticket } from '../types'

type BoardQueueProps = {
  tickets: Ticket[]
}

export function BoardQueue({ tickets }: BoardQueueProps) {
  const visibleTickets = tickets.filter((ticket) =>
    ['waiting', 'called', 'in_service'].includes(ticket.status),
  )
  const currentTicket = visibleTickets.find((ticket) => ticket.status === 'called') ?? visibleTickets[0]

  return (
    <section className="board-stage">
      {currentTicket ? (
        <article className="board-current-call">
          <span>Текущий вызов</span>
          <strong>{currentTicket.number}</strong>
          <p>{currentTicket.room.name}</p>
        </article>
      ) : (
        <p>Вызовы пациентов появятся здесь после подключения серверной части.</p>
      )}

      {visibleTickets.length > 1 ? (
        <div className="board-upcoming-list">
          {visibleTickets.slice(0, 4).map((ticket) => (
            <article key={ticket.id}>
              <strong>{ticket.number}</strong>
              <span>{ticket.room.name}</span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
