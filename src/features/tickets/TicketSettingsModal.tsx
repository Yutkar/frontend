import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Settings, X } from 'lucide-react'
import { ticketService } from '@services/ticketService'
import type {
  TicketSettingsOptions,
  TicketSettingsPayload,
  TicketSettingsServiceTypeOption,
} from '@services/api'
import type {
  Room,
  ServiceType,
  Ticket,
  TicketPriority,
  TicketStatus,
} from '@shared/types'
import {
  getPriorityMeta,
  getServiceTypeLabel,
  getTicketStatusMeta,
} from '@shared/utils'
import { Button } from '@shared/ui/components'

type TicketSettingsModalProps = {
  fallbackRooms: Room[]
  onClose: () => void
  onSaved: () => Promise<void>
  open: boolean
  ticket?: Ticket
}

const priorities: TicketPriority[] = ['low', 'normal', 'high', 'critical']
const statuses: TicketStatus[] = [
  'created',
  'waiting',
  'called',
  'in_service',
  'completed',
  'cancelled',
  'no_show',
  'redirected',
]

const emptyOptions: TicketSettingsOptions = {
  rooms: [],
  serviceTypes: [],
  specialists: [],
}

function getFallbackServiceType(ticket: Ticket): TicketSettingsServiceTypeOption {
  return {
    code: ticket.serviceType,
    id: ticket.serviceType,
    name: getServiceTypeLabel(ticket.serviceType),
  }
}

export function TicketSettingsModal({
  fallbackRooms,
  onClose,
  onSaved,
  open,
  ticket,
}: TicketSettingsModalProps) {
  const [comment, setComment] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [etaMinutes, setEtaMinutes] = useState(0)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [options, setOptions] = useState<TicketSettingsOptions>(emptyOptions)
  const [priority, setPriority] = useState<TicketPriority>('normal')
  const [roomId, setRoomId] = useState('')
  const [saving, setSaving] = useState(false)
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [status, setStatus] = useState<TicketStatus>('waiting')

  useEffect(() => {
    if (!open || !ticket) {
      return
    }

    setComment(ticket.notes ?? '')
    setDoctorId(ticket.assignedTo ?? '')
    setEtaMinutes(ticket.etaMinutes)
    setError(null)
    setPriority(ticket.priority)
    setRoomId(ticket.roomId ?? '')
    setServiceTypeId(ticket.serviceType)
    setStatus(ticket.status)
  }, [open, ticket])

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
        console.error('Ticket settings options load failed', loadError)
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

  useEffect(() => {
    if (!open || !ticket || options.serviceTypes.length === 0) {
      return
    }

    const currentServiceType = options.serviceTypes.find((item) => item.code === ticket.serviceType)

    if (currentServiceType) {
      setServiceTypeId(String(currentServiceType.id))
    }
  }, [open, options.serviceTypes, ticket])

  const serviceTypes = useMemo(() => {
    if (!ticket) {
      return options.serviceTypes
    }

    const hasCurrent = options.serviceTypes.some((item) => item.code === ticket.serviceType)

    return hasCurrent ? options.serviceTypes : [getFallbackServiceType(ticket), ...options.serviceTypes]
  }, [options.serviceTypes, ticket])

  const rooms = useMemo(() => {
    const mergedRooms = [...options.rooms]

    fallbackRooms.forEach((room) => {
      if (!mergedRooms.some((item) => String(item.id) === room.id)) {
        mergedRooms.push({
          id: room.id,
          name: room.name,
        })
      }
    })

    return mergedRooms
  }, [fallbackRooms, options.rooms])

  const specialists = useMemo(() => {
    if (!ticket?.assignedTo || options.specialists.some((item) => String(item.id) === ticket.assignedTo)) {
      return options.specialists
    }

    return [
      {
        id: ticket.assignedTo,
        name: 'Текущий специалист',
      },
      ...options.specialists,
    ]
  }, [options.specialists, ticket?.assignedTo])

  if (!open || !ticket) {
    return null
  }

  const selectedServiceType = serviceTypes.find((item) => String(item.id) === serviceTypeId)
  const isBusy = saving || loadingOptions

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!ticket) {
      return
    }

    const payload: TicketSettingsPayload = {
      comment,
      doctorId: doctorId || undefined,
      etaMinutes,
      priority,
      roomId: roomId || undefined,
      serviceType: selectedServiceType?.code ?? (serviceTypeId as ServiceType),
      serviceTypeId: selectedServiceType?.id ?? serviceTypeId,
      status,
    }

    setError(null)
    setSaving(true)

    try {
      await ticketService.updateTicketSettings(ticket.id, payload)
      await onSaved()
      onClose()
    } catch (saveError) {
      console.error('Ticket settings save failed', saveError)
      setError('Не удалось сохранить настройки талона.')
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
              <Settings size={14} />
              Управление
            </span>
            <h2>Настройки талона</h2>
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
          <label className="field">
            <span>Номер талона</span>
            <input readOnly value={ticket.number} />
          </label>

          <label className="field">
            <span>Тип услуги</span>
            <select
              disabled={isBusy}
              onChange={(event) => setServiceTypeId(event.target.value)}
              value={serviceTypeId}
            >
              {serviceTypes.map((serviceType) => (
                <option key={String(serviceType.id)} value={String(serviceType.id)}>
                  {serviceType.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Кабинет</span>
            <select
              disabled={isBusy}
              onChange={(event) => setRoomId(event.target.value)}
              value={roomId}
            >
              <option value="">Не назначен</option>
              {rooms.map((room) => (
                <option key={String(room.id)} value={String(room.id)}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Специалист</span>
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
              {priorities.map((item) => (
                <option key={item} value={item}>
                  {getPriorityMeta(item).label}
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
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {getTicketStatusMeta(item).label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Время ожидания</span>
            <input
              disabled={isBusy}
              min={0}
              onChange={(event) => setEtaMinutes(Number(event.target.value))}
              type="number"
              value={etaMinutes}
            />
          </label>

          <label className="field settings-comment-field">
            <span>Комментарий</span>
            <textarea
              disabled={isBusy}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              value={comment}
            />
          </label>
        </div>

        <footer className="modal-actions">
          <Button disabled={saving} onClick={onClose} variant="ghost">
            Отмена
          </Button>
          <Button disabled={isBusy} type="submit" variant="primary">
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </footer>
      </form>
    </div>
  )
}
