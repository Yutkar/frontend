import { AnalyticsCharts } from '@features/analytics/AnalyticsCharts'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { DashboardKpis } from '@widgets'
import { useCurrentTime } from '@shared/utils'
import { useQueueStore } from '@store/queue'

export function AnalyticsPage() {
  useQueueBootstrap()

  const analytics = useQueueStore((state) => state.analytics)
  const error = useQueueStore((state) => state.error)
  const hydrated = useQueueStore((state) => state.hydrated)
  const loading = useQueueStore((state) => state.loading)
  const rooms = useQueueStore((state) => state.rooms)
  const tickets = useQueueStore((state) => state.tickets)
  const now = useCurrentTime()

  return (
    <div className="page-stack">
      {loading && !hydrated ? (
        <section className="empty-state compact-empty">
          <h2>Загружаем аналитику</h2>
          <p>Получаем данные из backend.</p>
        </section>
      ) : null}
      {error ? (
        <section className="modal-error">
          <strong>Не удалось загрузить аналитику</strong>
          <p>Проверьте подключение к серверу.</p>
        </section>
      ) : null}
      <DashboardKpis />
      <AnalyticsCharts analytics={analytics} now={now} rooms={rooms} tickets={tickets} />
    </div>
  )
}
