import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnalyticsCharts } from '@features/analytics/AnalyticsCharts'
import {
  analyticsPeriodLabels,
  createPeriodAnalyticsFromTickets,
  getTicketsForAnalyticsPeriod,
} from '@features/analytics/periodAnalytics'
import { queueService } from '@services/queueService'
import { DashboardKpis } from '@widgets'
import { useCurrentTime } from '@shared/utils'
import type { AnalyticsPeriod, AnalyticsPoint } from '@shared/types'
import { useQueueStore } from '@store/queue'

const analyticsPeriods: AnalyticsPeriod[] = ['day', 'week', 'month']

export function AnalyticsPage() {
  const analytics = useQueueStore((state) => state.analytics)
  const error = useQueueStore((state) => state.error)
  const hydrated = useQueueStore((state) => state.hydrated)
  const loading = useQueueStore((state) => state.loading)
  const refreshAnalyticsData = useQueueStore((state) => state.refreshAnalyticsData)
  const rooms = useQueueStore((state) => state.rooms)
  const tickets = useQueueStore((state) => state.tickets)
  const [period, setPeriod] = useState<AnalyticsPeriod>('day')
  const [periodAnalytics, setPeriodAnalytics] = useState<AnalyticsPoint[]>([])
  const [periodError, setPeriodError] = useState<string | null>(null)
  const location = useLocation()
  const now = useCurrentTime()
  const hasAnalyticsData = analytics.length > 0 || tickets.length > 0 || rooms.length > 0
  const fallbackPeriodAnalytics = useMemo(
    () => createPeriodAnalyticsFromTickets(tickets, period, now),
    [now, period, tickets],
  )
  const chartAnalytics = fallbackPeriodAnalytics.length > 0
    ? fallbackPeriodAnalytics
    : periodAnalytics.length > 0
      ? periodAnalytics
      : analytics
  const periodTickets = useMemo(
    () => getTicketsForAnalyticsPeriod(tickets, period, now),
    [now, period, tickets],
  )

  useEffect(() => {
    let active = true

    setPeriodError(null)
    void refreshAnalyticsData()
    queueService
      .getPeriodAnalytics(period)
      .then((nextAnalytics) => {
        if (active) {
          setPeriodAnalytics(nextAnalytics)
        }
      })
      .catch((loadError) => {
        console.error('Analytics period load failed', loadError)
        if (active) {
          setPeriodAnalytics([])
          setPeriodError('Не удалось загрузить аналитику за выбранный период. Используем данные талонов.')
        }
      })

    return () => {
      active = false
    }
  }, [period, location.key, refreshAnalyticsData])

  useEffect(() => {
    const handleFocus = () => {
      void refreshAnalyticsData()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshAnalyticsData()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshAnalyticsData])

  return (
    <div className="page-stack">
      {loading && !hydrated ? (
        <section className="empty-state compact-empty">
          <h2>Загрузка аналитики...</h2>
          <p>Получаем данные из backend.</p>
        </section>
      ) : null}
      {error ? (
        <section className="empty-state compact-empty">
          <h2>Не удалось загрузить аналитику</h2>
          <p>Проверьте подключение к серверу.</p>
        </section>
      ) : hasAnalyticsData ? (
        <>
          <section className="analytics-period-panel">
            <label className="field">
              <span>Период аналитики</span>
              <select
                onChange={(event) => setPeriod(event.target.value as AnalyticsPeriod)}
                value={period}
              >
                {analyticsPeriods.map((item) => (
                  <option key={item} value={item}>
                    {analyticsPeriodLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            {periodError ? <div className="modal-info">{periodError}</div> : null}
          </section>
          <DashboardKpis rooms={rooms} tickets={periodTickets} />
          <AnalyticsCharts analytics={chartAnalytics} now={now} rooms={rooms} tickets={periodTickets} />
        </>
      ) : !loading && hydrated ? (
        <section className="empty-state compact-empty">
          <h2>Данных для аналитики пока нет</h2>
          <p>Создайте или обработайте талоны, чтобы увидеть статистику.</p>
        </section>
      ) : null}
    </div>
  )
}
