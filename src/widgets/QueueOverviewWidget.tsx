import type { Ticket } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { StatusBadge } from '@shared/ui/components'
import { formatEta, getServiceTypeLabel, getTicketStatusMeta } from '@shared/utils'

type QueueOverviewWidgetProps = {
  tickets: Ticket[]
}

export function QueueOverviewWidget({ tickets }: QueueOverviewWidgetProps) {
  const visibleTickets = tickets
    .filter((ticket) => ['waiting', 'called', 'in_service'].includes(ticket.status))
    .slice(0, 5)

  return (
    <section className="widget-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t.dashboard.queueOverviewEyebrow}</span>
          <h2>{t.dashboard.queueOverviewTitle}</h2>
        </div>
      </div>

      {visibleTickets.length > 0 ? (
        <div className="queue-overview-list">
          {visibleTickets.map((ticket) => {
            const meta = getTicketStatusMeta(ticket.status)

            return (
              <article className={`queue-overview-row overview-${meta.tone}`} key={ticket.id}>
                <div>
                  <strong>{ticket.number}</strong>
                  <span>{getServiceTypeLabel(ticket.serviceType)}</span>
                </div>
                <StatusBadge status={ticket.status} />
                <b>{formatEta(ticket.etaMinutes)}</b>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-inline">
          <strong>{t.dashboard.noActiveQueue}</strong>
          <span>{t.dashboard.newTicketsWillAppear}</span>
        </div>
      )}
    </section>
  )
}
