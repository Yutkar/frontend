import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AnalyticsCharts } from '@features/analytics/AnalyticsCharts'
import { DashboardKpis } from '@widgets'
import { useCurrentTime } from '@shared/utils'
import { useQueueStore } from '@store/queue'

export function AnalyticsPage() {
  const analytics = useQueueStore((state) => state.analytics)
  const error = useQueueStore((state) => state.error)
  const hydrated = useQueueStore((state) => state.hydrated)
  const loading = useQueueStore((state) => state.loading)
  const refreshAnalyticsData = useQueueStore((state) => state.refreshAnalyticsData)
  const rooms = useQueueStore((state) => state.rooms)
  const tickets = useQueueStore((state) => state.tickets)
  const location = useLocation()
  const now = useCurrentTime()
  const hasAnalyticsData = analytics.length > 0 || tickets.length > 0 || rooms.length > 0

  useEffect(() => {
    void refreshAnalyticsData()
  }, [location.key, refreshAnalyticsData])

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
          <DashboardKpis />
          <AnalyticsCharts analytics={analytics} now={now} rooms={rooms} tickets={tickets} />
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
