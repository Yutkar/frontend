import type { QueueEvent } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatTime } from '@shared/utils'

type RecentCallsWidgetProps = {
  events: QueueEvent[]
}

export function RecentCallsWidget({ events }: RecentCallsWidgetProps) {
  return (
    <section className="widget-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t.queue.signalLog}</span>
          <h2>{t.queue.recentEvents}</h2>
        </div>
      </div>
      <div className="event-list">
        {events.slice(0, 7).map((event) => (
          <article className={`event-row event-${event.type}`} key={event.id}>
            <span />
            <div>
              <strong>{event.message}</strong>
              <time>{formatTime(event.occurredAt)}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
