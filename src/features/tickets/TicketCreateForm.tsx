import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ClipboardPlus } from 'lucide-react'
import { adminService } from '@services/adminService'
import type { AdminRecord } from '@services/api'
import type { ServiceType, TicketCreateInput, TicketPriority } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { getPriorityMeta, getServiceTypeLabel } from '@shared/utils'

const serviceTypes: ServiceType[] = [
  'registration',
  'consultation',
  'diagnostics',
  'laboratory',
  'pharmacy',
  'billing',
]

const priorities: TicketPriority[] = ['low', 'normal', 'high', 'critical']

type RoomOption = {
  id: string
  name: string
}

type TicketCreateFormProps = {
  loading: boolean
  onSubmit: (input: TicketCreateInput) => Promise<void>
}

function getRecordText(record: AdminRecord, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = record[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (typeof value === 'number') {
      return String(value)
    }
  }

  return fallback
}

function getRoomActive(room: AdminRecord): boolean {
  if (typeof room.isActive === 'boolean') {
    return room.isActive
  }

  if (typeof room.active === 'boolean') {
    return room.active
  }

  return room.status !== 'paused' && room.status !== 'inactive' && room.status !== 'deleted'
}

function toRoomOption(room: AdminRecord): RoomOption {
  const id = String(room.id ?? room.roomId ?? room._id)

  return {
    id,
    name: getRecordText(room, ['name', 'title', 'roomName'], `Кабинет ${id}`),
  }
}

export function TicketCreateForm({ loading, onSubmit }: TicketCreateFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [patientName, setPatientName] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('normal')
  const [roomId, setRoomId] = useState('')
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [serviceType, setServiceType] = useState<ServiceType>('registration')
  const [notes, setNotes] = useState('')
  const selectedRoomExists = useMemo(
    () => rooms.some((room) => room.id === roomId),
    [roomId, rooms],
  )

  useEffect(() => {
    let active = true

    setRoomsLoading(true)
    setError(null)

    adminService
      .getRooms()
      .then((records) => {
        if (!active) {
          return
        }

        const activeRooms = records
          .filter(getRoomActive)
          .map(toRoomOption)
          .filter((room) => room.id && room.id !== 'undefined')

        setRooms(activeRooms)
        setRoomId((currentRoomId) => (
          currentRoomId && activeRooms.some((room) => room.id === currentRoomId)
            ? currentRoomId
            : activeRooms[0]?.id ?? ''
        ))
      })
      .catch((loadError) => {
        console.error('Ticket create rooms load failed', loadError)

        if (active) {
          setRooms([])
          setError('Не удалось загрузить кабинеты. Проверьте подключение к серверу.')
        }
      })
      .finally(() => {
        if (active) {
          setRoomsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!patientName.trim()) {
      return
    }

    if (!roomId || !selectedRoomExists) {
      setError('Выберите кабинет.')
      return
    }

    await onSubmit({
      patientName: patientName.trim(),
      priority,
      roomId,
      serviceType,
      notes: notes.trim() || undefined,
    })

    setPatientName('')
    setNotes('')
    setPriority('normal')
    setServiceType('registration')
  }

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>{t.tickets.patientName}</span>
        <input
          onChange={(event) => setPatientName(event.target.value)}
          placeholder={t.tickets.patientNamePlaceholder}
          value={patientName}
        />
      </label>

      <div className="form-grid">
        <label className="field">
          <span>{t.tickets.serviceType}</span>
          <select
            onChange={(event) => setServiceType(event.target.value as ServiceType)}
            value={serviceType}
          >
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {getServiceTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Кабинет</span>
          <select
            disabled={loading || roomsLoading || rooms.length === 0}
            onChange={(event) => setRoomId(event.target.value)}
            value={roomId}
          >
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))
            ) : (
              <option value="">Активные кабинеты не найдены</option>
            )}
          </select>
        </label>

        <label className="field">
          <span>{t.tickets.priority}</span>
          <select
            onChange={(event) => setPriority(event.target.value as TicketPriority)}
            value={priority}
          >
            {priorities.map((item) => (
              <option key={item} value={item}>
                {getPriorityMeta(item).label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>{t.tickets.notes}</span>
        <textarea
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t.tickets.notesPlaceholder}
          rows={4}
          value={notes}
        />
      </label>

      {error ? <div className="modal-error">{error}</div> : null}

      <Button
        disabled={loading || roomsLoading || !patientName.trim() || !roomId}
        icon={<ClipboardPlus size={18} />}
        type="submit"
        variant="primary"
      >
        {t.tickets.createTicket}
      </Button>
    </form>
  )
}
