import type { AnalyticsPoint, Room, Ticket } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatWaitingTime, getAverageWaitingMinutes } from '@shared/utils'

type AnalyticsChartsProps = {
  analytics: AnalyticsPoint[]
  now?: number
  rooms: Room[]
  tickets: Ticket[]
}

export function AnalyticsCharts({ analytics, now, rooms, tickets }: AnalyticsChartsProps) {
  const maxWaiting = Math.max(...analytics.map((point) => point.waiting), 1)

  return (
    <div className="analytics-grid">
      <section className="chart-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t.analytics.queueCurve}</span>
            <h2>{t.analytics.waitingVsCompleted}</h2>
          </div>
        </div>
        <div className="bar-chart">
          {analytics.map((point) => (
            <div className="bar-group" key={point.label}>
              <span
                className="bar bar-waiting"
                style={{ height: `${Math.max(12, (point.waiting / maxWaiting) * 100)}%` }}
              />
              <span
                className="bar bar-completed"
                style={{ height: `${Math.max(12, (point.completed / maxWaiting) * 100)}%` }}
              />
              <small>{point.label}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t.analytics.waitTime}</span>
            <h2>{t.analytics.averageWaitMinutes}</h2>
          </div>
        </div>
        <div className="wait-list">
          {analytics.map((point) => (
            <div className="wait-row" key={point.label}>
              <span>{point.label}</span>
              <div>
                <i style={{ width: `${Math.min(100, point.avgWaitMinutes * 2)}%` }} />
              </div>
              <strong>{formatWaitingTime(point.avgWaitMinutes)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-panel wide-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t.analytics.rooms}</span>
            <h2>{t.analytics.loadPerRoom}</h2>
          </div>
        </div>
        <div className="room-load-grid">
          {rooms.map((room) => {
            const roomTickets = tickets.filter((ticket) => ticket.roomId === room.id)
            const averageWaitingMinutes = getAverageWaitingMinutes(roomTickets, now)

            return (
              <article className="room-load-card" key={room.id}>
                <span>{room.name}</span>
                <strong>{room.loadPercent}%</strong>
                <small>
                  {averageWaitingMinutes === null
                    ? 'Нет очереди'
                    : `Среднее ожидание: ${formatWaitingTime(averageWaitingMinutes)}`}
                </small>
                <div className="load-track">
                  <i style={{ width: `${room.loadPercent}%` }} />
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
