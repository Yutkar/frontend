import type { AnalyticsPoint, Room, Ticket } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatWaitingTime, getAverageWaitingMinutes } from '@shared/utils'

type AnalyticsChartsProps = {
  analytics: AnalyticsPoint[]
  now?: number
  rooms: Room[]
  tickets: Ticket[]
}

const workdayStartHour = 8

function formatPeriodLabel(label: string, index: number): string {
  const normalizedLabel = label.trim()
  const periodMatch = normalizedLabel.match(/^Период\s+(\d+)$/i)
  const numericPeriod = periodMatch ? Number(periodMatch[1]) : Number(normalizedLabel)

  if (Number.isInteger(numericPeriod) && numericPeriod >= 1 && numericPeriod <= 24) {
    const hour = (workdayStartHour + numericPeriod - 1) % 24

    return `${String(hour).padStart(2, '0')}:00`
  }

  if (/^\d{1,2}:00$/.test(normalizedLabel)) {
    const [hour] = normalizedLabel.split(':')

    return `${hour.padStart(2, '0')}:00`
  }

  if (!normalizedLabel) {
    const hour = (workdayStartHour + index) % 24

    return `${String(hour).padStart(2, '0')}:00`
  }

  return normalizedLabel
}

function getCompletedServiceMinutes(ticket: Ticket): number | null {
  if (!ticket.startedAt || !ticket.completedAt) {
    return null
  }

  const startedAt = Date.parse(ticket.startedAt)
  const completedAt = Date.parse(ticket.completedAt)

  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    return null
  }

  return Math.round((completedAt - startedAt) / 60_000)
}

function getAverageServiceMinutes(tickets: Ticket[]): number | null {
  const serviceMinutes = tickets
    .map(getCompletedServiceMinutes)
    .filter((minutes): minutes is number => minutes !== null)

  if (serviceMinutes.length === 0) {
    return null
  }

  return Math.round(serviceMinutes.reduce((sum, minutes) => sum + minutes, 0) / serviceMinutes.length)
}

function formatOptionalDuration(minutes?: number): string {
  return minutes === undefined ? 'Нет данных' : formatWaitingTime(minutes)
}

export function AnalyticsCharts({ analytics, now, rooms, tickets }: AnalyticsChartsProps) {
  const maxTicketCount = Math.max(
    ...analytics.flatMap((point) => [point.waiting, point.completed]),
    1,
  )
  const maxDurationMinutes = Math.max(
    ...analytics.flatMap((point) => [point.avgWaitMinutes, point.avgServiceMinutes ?? 0]),
    1,
  )

  function getBarHeight(value: number, maxValue: number): string {
    if (value <= 0) {
      return '0%'
    }

    return `${Math.max(10, (value / maxValue) * 100)}%`
  }

  const formattedAnalytics = analytics.map((point, index) => ({
    ...point,
    displayLabel: formatPeriodLabel(point.label, index),
  }))

  return (
    <div className="analytics-grid">
      <section className="chart-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t.analytics.queueCurve}</span>
            <h2>{t.analytics.waitingVsCompleted}</h2>
          </div>
        </div>
        <div className="chart-legend">
          <span><i className="legend-dot legend-waiting" /> Ожидают</span>
          <span><i className="legend-dot legend-completed" /> Завершены</span>
        </div>
        <div className="analytics-chart-frame">
          <span className="analytics-axis-label analytics-axis-y">Количество талонов</span>
          <div className="bar-chart" role="img" aria-label="Количество ожидающих и завершённых талонов по периодам">
            {formattedAnalytics.map((point) => (
              <div className="bar-group" key={point.label}>
                <span
                  className="bar bar-waiting"
                  title={`Ожидают: ${point.waiting}`}
                  style={{ height: getBarHeight(point.waiting, maxTicketCount) }}
                />
                <span
                  className="bar bar-completed"
                  title={`Завершены: ${point.completed}`}
                  style={{ height: getBarHeight(point.completed, maxTicketCount) }}
                />
                <small>{point.displayLabel}</small>
              </div>
            ))}
          </div>
          <span className="analytics-axis-label analytics-axis-x">Период</span>
        </div>
        <p className="chart-note">
          Столбцы показывают, сколько талонов ожидали и сколько было завершено в каждом периоде.
        </p>
      </section>

      <section className="chart-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t.analytics.waitTime}</span>
            <h2>{t.analytics.averageWaitMinutes}</h2>
          </div>
        </div>
        <div className="analytics-axis-row">
          <span>Период</span>
          <span>Среднее время, мин</span>
        </div>
        <div className="chart-legend chart-legend-compact">
          <span><i className="legend-line legend-waiting" /> Ожидание</span>
          <span><i className="legend-line legend-service" /> Обслуживание</span>
        </div>
        <div className="analytics-scroll-panel">
          <div className="wait-list">
            {formattedAnalytics.map((point) => (
              <div className="duration-row" key={point.label}>
                <span>{point.displayLabel}</span>
                <div className="duration-bars">
                  <div>
                    <small>Ожидание</small>
                    <span>
                      <i className="duration-waiting" style={{ width: getBarHeight(point.avgWaitMinutes, maxDurationMinutes) }} />
                    </span>
                  </div>
                  <div>
                    <small>Обслуживание</small>
                    <span>
                      <i className="duration-service" style={{ width: getBarHeight(point.avgServiceMinutes ?? 0, maxDurationMinutes) }} />
                    </span>
                  </div>
                </div>
                <strong>
                  {formatWaitingTime(point.avgWaitMinutes)}
                  <small>{formatOptionalDuration(point.avgServiceMinutes)}</small>
                </strong>
              </div>
            ))}
          </div>
        </div>
        <p className="chart-note">
          Верхняя полоса показывает фактическое ожидание, нижняя — среднее обслуживание после завершения приёма.
        </p>
      </section>

      <section className="chart-panel wide-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t.analytics.rooms}</span>
            <h2>{t.analytics.loadPerRoom}</h2>
          </div>
        </div>
        <div className="chart-legend">
          <span><i className="legend-dot legend-waiting" /> Ожидают</span>
          <span><i className="legend-dot legend-called" /> Вызваны</span>
          <span><i className="legend-dot legend-service" /> На обслуживании</span>
          <span><i className="legend-dot legend-completed" /> Завершены</span>
        </div>
        <div className="analytics-axis-row">
          <span>Кабинет</span>
          <span>Среднее время ожидания, мин</span>
        </div>
        <div className="room-load-grid analytics-room-grid">
          {rooms.map((room) => {
            const roomTickets = tickets.filter((ticket) => ticket.roomId === room.id)
            const averageWaitingMinutes = getAverageWaitingMinutes(roomTickets, now)
            const averageServiceMinutes = getAverageServiceMinutes(roomTickets)
            const waitingCount = roomTickets.filter((ticket) => ticket.status === 'waiting').length
            const calledCount = roomTickets.filter((ticket) => ticket.status === 'called').length
            const inServiceCount = roomTickets.filter((ticket) => ticket.status === 'in_service').length
            const completedCount = roomTickets.filter((ticket) => ticket.status === 'completed').length

            return (
              <article className="room-load-card" key={room.id}>
                <span>{room.name}</span>
                <strong>{room.loadPercent}%</strong>
                <small>Статус кабинета: {t.status[room.status]}</small>
                <small>
                  {averageWaitingMinutes === null
                    ? 'Нет очереди'
                    : `Среднее ожидание: ${formatWaitingTime(averageWaitingMinutes)}`}
                </small>
                <small>
                  {averageServiceMinutes === null
                    ? 'Нет завершённых приёмов'
                    : `Среднее обслуживание: ${formatWaitingTime(averageServiceMinutes)}`}
                </small>
                <dl className="room-status-summary">
                  <div className="room-status-item room-status-waiting">
                    <dt>Ожидают</dt>
                    <dd>{waitingCount}</dd>
                  </div>
                  <div className="room-status-item room-status-called">
                    <dt>Вызваны</dt>
                    <dd>{calledCount}</dd>
                  </div>
                  <div className="room-status-item room-status-service">
                    <dt>На обслуживании</dt>
                    <dd>{inServiceCount}</dd>
                  </div>
                  <div className="room-status-item room-status-completed">
                    <dt>Завершены</dt>
                    <dd>{completedCount}</dd>
                  </div>
                </dl>
                <div className="load-track">
                  <i style={{ width: `${room.loadPercent}%` }} />
                </div>
              </article>
            )
          })}
        </div>
        <p className="chart-note">
          Процент отражает текущую нагрузку кабинета, а карточки помогают сравнить статусы талонов.
        </p>
      </section>
    </div>
  )
}
