import { useEffect } from 'react'
import { SpecialistControls } from '@features/specialist/SpecialistControls'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { t } from '@shared/locales/useLocale'
import { StatusBadge } from '@shared/ui/components'
import { useGlobalStore } from '@store/global'
import { useQueueStore } from '@store/queue'

export function SpecialistPanelPage() {
  useQueueBootstrap()

  const user = useGlobalStore((state) => state.user)
  const loadRoomQueue = useQueueStore((state) => state.loadRoomQueue)
  const rooms = useQueueStore((state) => state.rooms)
  const specialistRoomId = user?.roomId
  const room = rooms.find((item) => item.id === specialistRoomId) ?? (specialistRoomId
    ? {
        id: specialistRoomId,
        name: `Кабинет ${specialistRoomId}`,
        department: user?.department ?? 'Специалист',
        specialistName: user?.name ?? 'Специалист',
        status: 'open' as const,
        loadPercent: 0,
      }
    : undefined)

  useEffect(() => {
    if (!specialistRoomId) {
      return
    }

    void loadRoomQueue(specialistRoomId)
    const interval = window.setInterval(() => {
      void loadRoomQueue(specialistRoomId)
    }, 5_000)

    return () => window.clearInterval(interval)
  }, [loadRoomQueue, specialistRoomId])

  if (!user) {
    return null
  }

  if (!room) {
    return (
      <section className="empty-state">
        <span className="eyebrow">{t.specialist.panel}</span>
        <h1>Кабинет специалиста не назначен</h1>
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
