import { useEffect, useMemo, useState } from 'react'
import { Power, PowerOff } from 'lucide-react'
import { SpecialistControls } from '@features/specialist/SpecialistControls'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { adminService } from '@services/adminService'
import { t } from '@shared/locales/useLocale'
import type { Room, User } from '@shared/types'
import { Button, StatusBadge } from '@shared/ui/components'
import { formatRoomName, getServiceTypeLabel } from '@shared/utils'
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
          <dd>{formatRoomName(room)}</dd>
        </div>
        <div>
          <dt>Специальность</dt>
          <dd>{user.department || getRoomProcedureLabel(room)}</dd>
        </div>
      </dl>
    </div>
  )
}

function getUserRoomIds(user?: User | null): string[] {
  if (!user) {
    return []
  }

  return Array.from(new Set([
    user.roomId,
    user.assignedRoomId,
    ...(user.roomIds ?? []),
    ...(user.assignedRoomIds ?? []),
  ].filter((roomId): roomId is string => Boolean(roomId))))
}

function SpecialistRoomSelect({
  onChange,
  roomId,
  rooms,
}: {
  onChange: (roomId: string) => void
  roomId: string
  rooms: Room[]
}) {
  if (rooms.length <= 1) {
    return null
  }

  return (
    <label className="field specialist-room-select">
      <span>Кабинет</span>
      <select onChange={(event) => onChange(event.target.value)} value={roomId}>
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {formatRoomName(room)}
          </option>
        ))}
      </select>
    </label>
  )
}

function SpecialistRoomToggle({ onChanged, room }: { onChanged: (room: Room) => Promise<void>; room: Room }) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const roomInactive = room.isActive === false || room.status === 'paused'

  async function handleToggleRoom() {
    setError(null)
    setSaving(true)

    try {
      const nextActive = roomInactive
      await adminService.updateRoom(room.id, {
        active: nextActive,
        isActive: nextActive,
        name: room.name,
        serviceTypeIds: room.serviceTypeIds,
      })
      await onChanged({
        ...room,
        currentTicketId: nextActive ? room.currentTicketId : undefined,
        isActive: nextActive,
        status: nextActive ? 'open' : 'paused',
      })
    } catch (toggleError) {
      console.error('Specialist room toggle failed', toggleError)
      setError(roomInactive ? 'Не удалось открыть кабинет' : 'Не удалось закрыть кабинет')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="specialist-room-toggle">
      <Button
        disabled={saving}
        icon={roomInactive ? <Power size={18} /> : <PowerOff size={18} />}
        onClick={handleToggleRoom}
        variant={roomInactive ? 'primary' : 'danger'}
      >
        {roomInactive
          ? saving ? 'Включаем выдачу...' : 'Включить выдачу талонов'
          : saving ? 'Закрываем выдачу...' : 'Закрыть выдачу талонов'}
      </Button>
      {error ? <div className="modal-error">{error}</div> : null}
    </div>
  )
}

export function SpecialistPanelPage() {
  useQueueBootstrap()

  const [roomOverride, setRoomOverride] = useState<Room | null>(null)
  const [roomStatusChecked, setRoomStatusChecked] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const user = useGlobalStore((state) => state.user)
  const hydrated = useQueueStore((state) => state.hydrated)
  const loadRoomNoShowTickets = useQueueStore((state) => state.loadRoomNoShowTickets)
  const loadRoomQueue = useQueueStore((state) => state.loadRoomQueue)
  const loading = useQueueStore((state) => state.loading)
  const rooms = useQueueStore((state) => state.rooms)
  const specialistRoomIds = useMemo(() => getUserRoomIds(user), [user])
  const specialistRoomId = specialistRoomIds.includes(selectedRoomId)
    ? selectedRoomId
    : specialistRoomIds[0]
  const storeRoom = rooms.find((item) => item.id === specialistRoomId)
  const assignedRooms = specialistRoomIds
    .map((roomId) => rooms.find((item) => item.id === roomId))
    .filter((item): item is Room => Boolean(item))
  const room = storeRoom
    ? roomOverride && roomOverride.id === storeRoom.id
      ? { ...storeRoom, ...roomOverride }
      : storeRoom
    : roomOverride?.id === specialistRoomId
      ? roomOverride
      : undefined
  const roomInactive = room?.isActive === false || room?.status === 'paused'

  useEffect(() => {
    if (!specialistRoomIds.length) {
      setSelectedRoomId('')
      return
    }

    if (!specialistRoomIds.includes(selectedRoomId)) {
      setSelectedRoomId(specialistRoomIds[0])
    }
  }, [selectedRoomId, specialistRoomIds])

  async function refreshSpecialistRoom(nextRoom?: Room) {
    if (nextRoom) {
      setRoomOverride(nextRoom)
    }

    if (specialistRoomId) {
      await Promise.all([
        loadRoomQueue(specialistRoomId),
        loadRoomNoShowTickets(specialistRoomId),
      ])
    }
  }

  useEffect(() => {
    if (!specialistRoomId) {
      setRoomStatusChecked(false)
      return
    }

    let active = true
    const roomId = specialistRoomId

    setRoomStatusChecked(false)

    async function refreshRoomQueue() {
      await Promise.all([
        loadRoomQueue(roomId),
        loadRoomNoShowTickets(roomId),
      ])

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
  }, [loadRoomNoShowTickets, loadRoomQueue, specialistRoomId])

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

  return (
    <div className="page-stack">
      <section className="specialist-header">
        <SpecialistUserSummary room={room} user={user} />
        <div className="specialist-header-actions">
          <SpecialistRoomSelect
            onChange={(nextRoomId) => {
              setRoomOverride(null)
              setSelectedRoomId(nextRoomId)
            }}
            roomId={specialistRoomId}
            rooms={assignedRooms}
          />
          <StatusBadge
            label={roomInactive ? 'Выдача остановлена' : t.status[room.status]}
            tone={roomInactive ? 'warning' : 'success'}
          />
          <SpecialistRoomToggle onChanged={refreshSpecialistRoom} room={room} />
        </div>
      </section>
      {roomInactive ? (
        <div className="modal-info">
          Новые талоны в этот кабинет не выдаются. Текущую очередь можно продолжать обслуживать.
        </div>
      ) : null}
      <SpecialistControls room={room} />
    </div>
  )
}
