import { AnalyticsCharts } from '@features/analytics/AnalyticsCharts'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { DashboardKpis } from '@widgets'
import { useCurrentTime } from '@shared/utils'
import { useQueueStore } from '@store/queue'

export function AnalyticsPage() {
  useQueueBootstrap()

  const analytics = useQueueStore((state) => state.analytics)
  const rooms = useQueueStore((state) => state.rooms)
  const tickets = useQueueStore((state) => state.tickets)
  const now = useCurrentTime()

  return (
    <div className="page-stack">
      <DashboardKpis />
      <AnalyticsCharts analytics={analytics} now={now} rooms={rooms} tickets={tickets} />
    </div>
  )
}
