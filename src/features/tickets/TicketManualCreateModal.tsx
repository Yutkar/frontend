import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PlusCircle, X } from 'lucide-react'
import { ticketService } from '@services/ticketService'
import type {
  TicketCreateSettingsPayload,
  TicketSettingsOptions,
} from '@services/api'
import type {
  Room,
  ServiceType,
  TicketPriority,
  TicketStatus,
} from '@shared/types'
import { Button } from '@shared/ui/components'
import {
  getPriorityLabel,
  getRoomsForService,
  getServiceOptionLabel,
  getServiceTypes,
  getSpecialistsForRoom,
  getStatusLabel,
  ticketPriorities,
  ticketStatuses,
} from './ticketFormOptions'

type TicketManualCreateModalProps = {
  fallbackRooms: Room[]
  onClose: () => void
  onSaved: () => Promise<void>
  open: boolean
}

const emptyOptions: TicketSettingsOptions = {
  rooms: [],
  serviceTypes: [],
  specialists: [],
}

export function TicketManualCreateModal({
  fallbackRooms,
  onClose,
  onSaved,
  open,
}: TicketManualCreateModalProps) {
  const [doctorId, setDoctorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [options, setOptions] = useState<TicketSettingsOptions>(emptyOptions)
  const [priority, setPriority] = useState<TicketPriority>('normal')
  const [roomId, setRoomId] = useState('')
  const [saving, setSaving] = useState(false)
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [status, setStatus] = useState<TicketStatus>('waiting')

  useEffect(() => {
    if (!open) {
      return
    }

    setDoctorId('')
    setError(null)
    setPriority('normal')
    setRoomId('')
    setSaving(false)
    setServiceTypeId('')
    setStatus('waiting')
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    let active = true

    setLoadingOptions(true)
    ticketService
      .getTicketSettingsOptions()
      .then((nextOptions) => {
        if (active) {
          setOptions(nextOptions)
        }
      })
      .catch((loadError) => {
        console.error('Ticket create options load failed', loadError)
        if (active) {
          setOptions(emptyOptions)
        }
      })
      .finally(() => {
        if (active) {
          setLoadingOptions(false)
        }
      })

    return () => {
      active = false
    }
  }, [open])

  const serviceTypes = useMemo(() => getServiceTypes(options), [options])
  const selectedServiceType = serviceTypes.find((item) => String(item.id) === serviceTypeId) ?? serviceTypes[0]
  const rooms = useMemo(
    () => getRoomsForService(options, selectedServiceType?.id, fallbackRooms),
    [fallbackRooms, options, selectedServiceType?.id],
  )
  const specialists = useMemo(
    () => getSpecialistsForRoom(options, roomId),
    [options, roomId],
  )
  const selectedRoomExists = useMemo(
    () => rooms.some((room) => String(room.id) === roomId),
    [roomId, rooms],
  )
  const canCreateTicket = Boolean(selectedServiceType && selectedRoomExists && priority && status)

  useEffect(() => {
    const hasSelectedServiceType = serviceTypes.some(
      (serviceType) => String(serviceType.id) === serviceTypeId,
    )

    if (open && serviceTypes[0] && !hasSelectedServiceType) {
      setServiceTypeId(String(serviceTypes[0].id))
    }
  }, [open, serviceTypeId, serviceTypes])

  useEffect(() => {
    if (!open) {
      return
    }

    setRoomId((currentRoomId) => (
      currentRoomId && rooms.some((room) => String(room.id) === currentRoomId)
        ? currentRoomId
        : ''
    ))
  }, [open, rooms])

  useEffect(() => {
    if (!open) {
      return
    }

    setDoctorId((currentDoctorId) => (
      currentDoctorId && specialists.some((specialist) => String(specialist.id) === currentDoctorId)
        ? currentDoctorId
        : ''
    ))
  }, [open, specialists])

  if (!open) {
    return null
  }

  const isBusy = saving || loadingOptions

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedServiceType) {
      setError('Выберите тип услуги.')
      return
    }

    if (!roomId || !selectedRoomExists) {
      setError('Выберите кабинет')
      return
    }

    const payload: TicketCreateSettingsPayload = {
      doctorId: doctorId || undefined,
      priority,
      roomId: roomId || undefined,
      serviceType: selectedServiceType.code ?? (serviceTypeId as ServiceType),
      serviceTypeId: selectedServiceType.id,
      status,
    }

    setError(null)
    setSaving(true)

    try {
      await ticketService.createTicketWithSettings(payload)
      await onSaved()
      onClose()
    } catch (saveError) {
      console.error('Manual ticket create failed', saveError)
      setError('Не удалось создать талон.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div aria-modal="true" className="modal-backdrop" role="dialog">
      <form className="ticket-settings-modal" onSubmit={handleSubmit}>
        <header className="modal-header">
          <div>
            <span className="eyebrow">
              <PlusCircle size={14} />
              Управление
            </span>
            <h2>Создать талон</h2>
          </div>
          <button
            aria-label="Отмена"
            className="modal-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        {error ? <div className="modal-error">{error}</div> : null}

        <div className="settings-form-grid">
          <label className="field service-type-field">
            <span>Тип услуги</span>
            <select
              disabled={isBusy}
              onChange={(event) => {
                setServiceTypeId(event.target.value)
                setRoomId('')
                setDoctorId('')
              }}
              value={serviceTypeId}
            >
              {serviceTypes.map((serviceType) => (
                <option key={String(serviceType.id)} value={String(serviceType.id)}>
                  {getServiceOptionLabel(serviceType)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Кабинет</span>
            <select
              disabled={isBusy || rooms.length === 0}
              onChange={(event) => {
                setRoomId(event.target.value)
                setDoctorId('')
              }}
              value={roomId}
            >
              <option value="">Выберите кабинет</option>
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <option key={String(room.id)} value={String(room.id)}>
                    {room.name}
                  </option>
                ))
              ) : (
                <option value="">Нет доступных кабинетов</option>
              )}
            </select>
            {selectedServiceType && rooms.length === 0 ? (
              <small className="field-hint">Нет доступных кабинетов для выбранной услуги</small>
            ) : null}
          </label>

          <label className="field">
            <span>Врач</span>
            <select
              disabled={isBusy}
              onChange={(event) => setDoctorId(event.target.value)}
              value={doctorId}
            >
              <option value="">Не назначен</option>
              {specialists.map((specialist) => (
                <option key={String(specialist.id)} value={String(specialist.id)}>
                  {specialist.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Приоритет</span>
            <select
              disabled={isBusy}
              onChange={(event) => setPriority(event.target.value as TicketPriority)}
              value={priority}
            >
              {ticketPriorities.map((item) => (
                <option key={item} value={item}>
                  {getPriorityLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Статус</span>
            <select
              disabled={isBusy}
              onChange={(event) => setStatus(event.target.value as TicketStatus)}
              value={status}
            >
              {ticketStatuses.map((item) => (
                <option key={item} value={item}>
                  {getStatusLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <footer className="modal-actions">
          <Button disabled={saving} onClick={onClose} variant="ghost">
            Отмена
          </Button>
          <Button disabled={isBusy || !canCreateTicket} type="submit" variant="primary">
            {saving ? 'Создаём...' : 'Создать'}
          </Button>
        </footer>
      </form>
    </div>
  )
}
