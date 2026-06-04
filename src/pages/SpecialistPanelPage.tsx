import { useEffect, useState } from 'react'
import { SpecialistControls } from '@features/specialist/SpecialistControls'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { t } from '@shared/locales/useLocale'
import type { Room, User } from '@shared/types'
import { StatusBadge } from '@shared/ui/components'
import { getServiceTypeLabel } from '@shared/utils'
import { useGlobalStore } from '@store/global'
import { useQueueStore } from '@store/queue'

function getRoomProcedureLabel(room?: Room): string {
  if (!room) {
    return '-'
  }

  const directServices = [...(room.serviceTypes ?? []), ...(room.services ?? [])]
    .map((service) => {
      if (typeof service === 'string' || typeof service === 'number') {
        return String(service)
      }

      return service.name ?? service.title ?? String(service.serviceTypeId ?? '')
    })
    .filter(Boolean)

  if (directServices.length > 0) {
    return Array.from(new Set(directServices)).join(', ')
  }

  return room.department || getServiceTypeLabel('consultation')
}

function SpecialistUserSummary({ room, user }: { room: Room; user: User }) {
  return (
    <div>
      <span className="eyebrow">Текущий специалист</span>
      <h2>{user.name}</h2>
      <dl className="specialist-doctor-details">
        <div>
          <dt>ФИО</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt>Кабинет</dt>
          <dd>{room.name}</dd>
        </div>
        <div>
          <dt>Специальность</dt>
          <dd>{user.department || getRoomProcedureLabel(room)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function SpecialistPanelPage() {
  useQueueBootstrap()

  const [roomStatusChecked, setRoomStatusChecked] = useState(false)
  const user = useGlobalStore((state) => state.user)
  const hydrated = useQueueStore((state) => state.hydrated)
  const loadRoomQueue = useQueueStore((state) => state.loadRoomQueue)
  const loading = useQueueStore((state) => state.loading)
  const rooms = useQueueStore((state) => state.rooms)
  const specialistRoomId = user?.roomId ?? user?.assignedRoomId
  const room = rooms.find((item) => item.id === specialistRoomId)
  const roomInactive = room?.isActive === false || room?.status === 'paused'

  useEffect(() => {
    if (!specialistRoomId) {
      setRoomStatusChecked(false)
      return
    }

    let active = true
    const roomId = specialistRoomId

    setRoomStatusChecked(false)

    async function refreshRoomQueue() {
      await loadRoomQueue(roomId)

      if (active) {
        setRoomStatusChecked(true)
      }
    }

    void refreshRoomQueue()
    const interval = window.setInterval(() => {
      void refreshRoomQueue()
    }, 5_000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [loadRoomQueue, specialistRoomId])

  if (!user) {
    return null
  }

  if (!room) {
    if (specialistRoomId && (loading || !hydrated || !roomStatusChecked)) {
      return (
        <section className="empty-state">
          <span className="eyebrow">{t.specialist.panel}</span>
          <h1>Загрузка данных...</h1>
          <p>Проверяем статус кабинета специалиста.</p>
        </section>
      )
    }

    return (
      <section className="empty-state">
        <span className="eyebrow">{t.specialist.panel}</span>
        <h1>{specialistRoomId ? 'Кабинет специалиста неактивен' : 'Кабинет специалиста не назначен'}</h1>
        <p>{specialistRoomId ? 'Ваш кабинет временно закрыт. Обратитесь к администратору.' : t.specialist.assignRoom}</p>
      </section>
    )
  }

  if (roomInactive) {
    return (
      <div className="page-stack">
        <section className="specialist-header">
          <SpecialistUserSummary room={room} user={user} />
          <StatusBadge label="Кабинет закрыт" tone="warning" />
        </section>
        <section className="empty-state">
          <span className="eyebrow">{t.specialist.panel}</span>
          <h1>Кабинет специалиста неактивен</h1>
          <p>Ваш кабинет временно закрыт. Управление очередью недоступно.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="specialist-header">
        <SpecialistUserSummary room={room} user={user} />
        <StatusBadge label={t.status[room.status]} tone={room.status === 'paused' ? 'warning' : 'success'} />
      </section>
      <SpecialistControls room={room} />
    </div>
  )
}
