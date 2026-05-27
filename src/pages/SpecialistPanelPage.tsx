import { SpecialistControls } from '@features/specialist/SpecialistControls'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { t } from '@shared/locales/useLocale'
import { StatusBadge } from '@shared/ui/components'
import { useGlobalStore } from '@store/global'
import { useQueueStore } from '@store/queue'

export function SpecialistPanelPage() {
  useQueueBootstrap()

  const user = useGlobalStore((state) => state.user)
  const rooms = useQueueStore((state) => state.rooms)
  const room = rooms.find((item) => item.id === user.roomId) ?? rooms[0]

  if (!room) {
    return (
      <section className="empty-state">
        <span className="eyebrow">{t.specialist.panel}</span>
        <h1>{t.specialist.noRoomAssigned}</h1>
        <p>{t.specialist.assignRoom}</p>
      </section>
    )
  }

  return (
    <div className="page-stack">
      <section className="specialist-header">
        <div>
          <span className="eyebrow">{t.specialist.currentPatientView}</span>
          <h2>{room.specialistName}</h2>
        </div>
        <StatusBadge label={t.status[room.status]} tone={room.status === 'paused' ? 'warning' : 'success'} />
      </section>
      <SpecialistControls room={room} />
    </div>
  )
}
