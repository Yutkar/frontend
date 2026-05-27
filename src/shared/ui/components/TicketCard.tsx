import type { ReactNode } from 'react'
import type { Room, Ticket } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatEta, formatTime, getServiceTypeLabel } from '@shared/utils'
import { StatusBadge } from './StatusBadge'

type TicketCardProps = {
  ticket: Ticket
  room?: Room
  actionSlot?: ReactNode
  compact?: boolean
}

export function TicketCard({ actionSlot, compact = false, room, ticket }: TicketCardProps) {
  return (
    <article className={`ticket-card ${compact ? 'ticket-card-compact' : ''}`}>
      <header>
        <div>
          <span className="ticket-number">{ticket.number}</span>
          <h3>{ticket.patientName}</h3>
        </div>
        <StatusBadge status={ticket.status} />
      </header>

      <div className="ticket-card-grid">
        <span>
          <small>{t.tickets.service}</small>
          {getServiceTypeLabel(ticket.serviceType)}
        </span>
        <span>
          <small>{t.tickets.priority}</small>
          <StatusBadge priority={ticket.priority} />
        </span>
        <span>
          <small>{t.tickets.eta}</small>
          {formatEta(ticket.etaMinutes)}
        </span>
        <span>
          <small>{t.tickets.created}</small>
          {formatTime(ticket.createdAt)}
        </span>
        <span>
          <small>{t.tickets.room}</small>
          {room?.name ?? t.tickets.unassigned}
        </span>
      </div>

      {ticket.notes ? <p className="ticket-note">{ticket.notes}</p> : null}
      {actionSlot ? <footer>{actionSlot}</footer> : null}
    </article>
  )
}
