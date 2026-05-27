import { AnalyticsCharts } from '@features/analytics/AnalyticsCharts'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { DashboardKpis } from '@widgets'
import { useQueueStore } from '@store/queue'

export function AnalyticsPage() {
  useQueueBootstrap()

  const analytics = useQueueStore((state) => state.analytics)
  const rooms = useQueueStore((state) => state.rooms)

  return (
    <div className="page-stack">
      <DashboardKpis />
      <AnalyticsCharts analytics={analytics} rooms={rooms} />
    </div>
  )
}
