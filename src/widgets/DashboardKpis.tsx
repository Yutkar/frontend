import { ClipboardList, Clock3, DoorOpen, Stethoscope } from 'lucide-react'
import { t } from '@shared/locales/useLocale'
import { KPIWidget } from '@shared/ui/components'
import { formatEta } from '@shared/utils'
import { useQueueStore } from '@store/queue'

export function DashboardKpis() {
  const kpi = useQueueStore((state) => state.kpi)
  const rooms = useQueueStore((state) => state.rooms)
  const tickets = useQueueStore((state) => state.tickets)
  const activeRooms = rooms.filter((room) => room.status !== 'paused').length

  return (
    <section className="kpi-grid">
      <KPIWidget
        helper={t.dashboard.totalTicketsHelper}
        icon={<ClipboardList size={20} />}
        title={t.dashboard.totalTicketsToday}
        tone="info"
        value={tickets.length}
      />
      <KPIWidget
        delta="-3m"
        helper={t.dashboard.averageWaitingHelper}
        icon={<Clock3 size={20} />}
        title={t.dashboard.averageWaitingTime}
        tone={kpi.averageWaitMinutes >= 25 ? 'warning' : 'success'}
        value={formatEta(kpi.averageWaitMinutes)}
      />
      <KPIWidget
        helper={t.dashboard.activeRoomsHelper}
        icon={<Stethoscope size={20} />}
        title={t.dashboard.activeRooms}
        tone="success"
        value={activeRooms}
      />
      <KPIWidget
        helper={t.dashboard.completedTicketsHelper}
        icon={<DoorOpen size={20} />}
        title={t.dashboard.completedTickets}
        tone={kpi.completedToday > 0 ? 'success' : 'neutral'}
        value={kpi.completedToday}
      />
    </section>
  )
}
