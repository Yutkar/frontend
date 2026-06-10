import { useEffect, useState } from 'react'
import { Power, PowerOff } from 'lucide-react'
import { SpecialistControls } from '@features/specialist/SpecialistControls'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { adminService } from '@services/adminService'
import { ticketService } from '@services/ticketService'
import type { TicketSettingsServiceTypeOption } from '@services/api'
import { t } from '@shared/locales/useLocale'
import type { Room, User } from '@shared/types'
import { Button, StatusBadge } from '@shared/ui/components'
import { formatRoomName, getServiceTypeLabel } from '@shared/utils'
import { useGlobalStore } from '@store/global'
import { useQueueStore } from '@store/queue'

function getRoomProcedureLabel(room?: Room, serviceTypes: TicketSettingsServiceTypeOption[] = []): string {
  if (!room) {
    return '-'
  }

  const serviceTypeById = new Map(serviceTypes.map((serviceType) => [String(serviceType.id), serviceType.name]))
  const directServices = [...(room.serviceTypes ?? []), ...(room.services ?? [])]
    .map((service) => {
      if (typeof service === 'string' || typeof service === 'number') {
        return serviceTypeById.get(String(service)) ?? String(service)
      }

      const serviceId = String(service.serviceTypeId ?? service.id ?? service._id ?? '')

      return service.name ?? service.title ?? serviceTypeById.get(serviceId) ?? serviceId
    })
    .filter(Boolean)

  if (directServices.length > 0) {
    return Array.from(new Set(directServices)).join(', ')
  }

  const serviceNames = [room.serviceTypeId, ...(room.serviceTypeIds ?? [])]
    .map((serviceTypeId) => serviceTypeById.get(String(serviceTypeId)))
    .filter((name): name is string => Boolean(name))

  if (serviceNames.length > 0) {
    return Array.from(new Set(serviceNames)).join(', ')
  }

  return room.department || getServiceTypeLabel('consultation')
}

function hasConfiguredServices(room: Room): boolean {
  const serviceIds = [
    ...(room.serviceTypeIds ?? []),
    ...(room.services ?? []).map((service) => (typeof service === 'object' ? service.id ?? service.serviceTypeId : service)),
    ...(room.serviceTypes ?? []).map((service) => (typeof service === 'object' ? service.id ?? service.serviceTypeId : service)),
  ].filter((serviceId) => serviceId !== undefined && serviceId !== null && String(serviceId).trim() !== '')

  return Boolean(room.serviceTypeId) || serviceIds.length > 0
}

function SpecialistUserSummary({
  room,
  serviceTypes,
  user,
}: {
  room: Room
  serviceTypes: TicketSettingsServiceTypeOption[]
  user: User
}) {
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
          <dt>Место обслуживания</dt>
          <dd>{formatRoomName(room)}</dd>
        </div>
        <div>
          <dt>Специальность</dt>
          <dd>{user.department || getRoomProcedureLabel(room, serviceTypes)}</dd>
        </div>
      </dl>
    </div>
  )
}

function SpecialistRoomToggle({ onChanged, room }: { onChanged: (room: Room) => Promise<void>; room: Room }) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const issueClosed = (room.ticketIssueEnabled ?? room.isTicketIssueEnabled ?? room.kioskEnabled) === false

  async function handleToggleRoom() {
    setError(null)
    setSaving(true)

    try {
      if (issueClosed && !hasConfiguredServices(room)) {
        setError('У кабинета не настроены услуги')
        return
      }

      const nextIssueEnabled = issueClosed
      await adminService.updateRoom(room.id, {
        isTicketIssueEnabled: nextIssueEnabled,
        ticketIssueEnabled: nextIssueEnabled,
      })
      await onChanged({
        ...room,
        isTicketIssueEnabled: nextIssueEnabled,
        ticketIssueEnabled: nextIssueEnabled,
      })
    } catch (toggleError) {
      console.error('Specialist room toggle failed', toggleError)
      setError(issueClosed ? 'Не удалось открыть выдачу талонов' : 'Не удалось закрыть выдачу талонов')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="specialist-room-toggle">
      <Button
        disabled={saving}
        icon={issueClosed ? <Power size={18} /> : <PowerOff size={18} />}
        onClick={handleToggleRoom}
        variant={issueClosed ? 'primary' : 'danger'}
      >
          {issueClosed
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
  const [serviceTypes, setServiceTypes] = useState<TicketSettingsServiceTypeOption[]>([])
  const user = useGlobalStore((state) => state.user)
  const hydrated = useQueueStore((state) => state.hydrated)
  const loadRoomNoShowTickets = useQueueStore((state) => state.loadRoomNoShowTickets)
  const loadRoomQueue = useQueueStore((state) => state.loadRoomQueue)
  const loading = useQueueStore((state) => state.loading)
  const rooms = useQueueStore((state) => state.rooms)
  const specialistRoomId = user?.roomId ?? user?.assignedRoomId
  const storeRoom = rooms.find((item) => item.id === specialistRoomId)
  const room = storeRoom
    ? roomOverride && roomOverride.id === storeRoom.id
      ? { ...storeRoom, ...roomOverride }
      : storeRoom
    : roomOverride?.id === specialistRoomId
      ? roomOverride
      : undefined
  const roomInactive = room?.isActive === false || room?.status === 'paused'

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

  useEffect(() => {
    let active = true

    ticketService
      .getTicketSettingsOptions()
      .then((options) => {
        if (active) {
          setServiceTypes(options.serviceTypes)
        }
      })
      .catch((loadError) => {
        console.error('Specialist service types load failed', loadError)
        if (active) {
          setServiceTypes([])
        }
      })

    return () => {
      active = false
    }
  }, [])

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
        <SpecialistUserSummary room={room} serviceTypes={serviceTypes} user={user} />
        <div className="specialist-header-actions">
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
