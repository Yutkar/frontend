import type { QueueEvent } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatRoomName, formatTime } from '@shared/utils'

type RecentCallsWidgetProps = {
  events: QueueEvent[]
}

export function RecentCallsWidget({ events }: RecentCallsWidgetProps) {
  return (
    <section className="widget-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t.queue.recentEvents}</span>
          <h2>{t.queue.signalLog}</h2>
        </div>
      </div>
      {events.length > 0 ? (
        <div className="event-list">
          {events.slice(0, 20).map((event) => {
            const roomLabel = event.roomName || event.roomId
              ? formatRoomName({ id: event.roomId, name: event.roomName })
              : ''
            const meta = [
              event.ticketNumber ? `Талон ${event.ticketNumber}` : '',
              roomLabel,
            ].filter(Boolean).join(' · ')

            return (
              <article className={`event-row event-${event.type}`} key={event.id}>
                <span />
                <div>
                  <strong>{event.message}</strong>
                  <time>
                    {formatTime(event.createdAt ?? event.occurredAt)}
                    {meta ? ` — ${meta}` : ''}
                  </time>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-inline">
          <strong>Событий пока нет</strong>
          <span>Новые действия с очередью появятся здесь.</span>
        </div>
      )}
    </section>
  )
}
