import { Activity, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { t } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { useQueueStore } from '@store/queue'
import {
  DashboardKpis,
  QueueOverviewWidget,
  RecommendationsWidget,
  RoomLoadWidget,
} from '@widgets'

export function DashboardPage() {
  useQueueBootstrap()

  const recommendations = useQueueStore((state) => state.recommendations)
  const rooms = useQueueStore((state) => state.rooms)
  const tickets = useQueueStore((state) => state.tickets)

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">
            <Activity size={14} />
            {t.dashboard.commandCenter}
          </span>
          <h2>{t.dashboard.hospitalQueueOperations}</h2>
          <p>{t.dashboard.description}</p>
        </div>
        <Link to="/queue">
          <Button icon={<ArrowRight size={17} />} variant="primary">
            {t.dashboard.openQueue}
          </Button>
        </Link>
      </section>

      <DashboardKpis />

      <section className="dashboard-grid">
        <QueueOverviewWidget tickets={tickets} />
        <RoomLoadWidget rooms={rooms} />
        <RecommendationsWidget recommendations={recommendations} />
      </section>
    </div>
  )
}
