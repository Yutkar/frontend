import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ClipboardPlus } from 'lucide-react'
import { ticketService } from '@services/ticketService'
import type { TicketSettingsOptions } from '@services/api'
import type { TicketCreateInput, TicketPriority } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { formatRoomName, getPriorityMeta } from '@shared/utils'
import {
  getRoomsForService,
  getServiceOptionLabel,
  getServiceTypes,
} from './ticketFormOptions'

const priorities: TicketPriority[] = ['low', 'normal', 'high', 'critical']

type TicketCreateFormProps = {
  loading: boolean
  onSubmit: (input: TicketCreateInput) => Promise<void>
}

const emptyOptions: TicketSettingsOptions = {
  rooms: [],
  serviceTypes: [],
  specialists: [],
}

export function TicketCreateForm({ loading, onSubmit }: TicketCreateFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [patientName, setPatientName] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('normal')
  const [roomId, setRoomId] = useState('')
  const [options, setOptions] = useState<TicketSettingsOptions>(emptyOptions)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [serviceTypeId, setServiceTypeId] = useState('')
  const [notes, setNotes] = useState('')
  const serviceTypes = useMemo(() => getServiceTypes(options), [options])
  const selectedServiceType = serviceTypes.find((item) => String(item.id) === serviceTypeId) ?? serviceTypes[0]
  const rooms = useMemo(
    () => getRoomsForService(options, selectedServiceType?.id),
    [options, selectedServiceType?.id],
  )
  const selectedRoomExists = useMemo(
    () => rooms.some((room) => String(room.id) === roomId),
    [roomId, rooms],
  )
  const canCreateTicket = Boolean(selectedServiceType && selectedRoomExists && priority)

  useEffect(() => {
    let active = true

    setOptionsLoading(true)
    setError(null)

    ticketService
      .getTicketSettingsOptions()
      .then((nextOptions) => {
        if (!active) {
          return
        }

        setOptions(nextOptions)
      })
      .catch((loadError) => {
        console.error('Ticket create options load failed', loadError)

        if (active) {
          setOptions(emptyOptions)
          setError('Не удалось загрузить услуги и кабинеты. Проверьте подключение к серверу.')
        }
      })
      .finally(() => {
        if (active) {
          setOptionsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!serviceTypeId && serviceTypes[0]) {
      setServiceTypeId(String(serviceTypes[0].id))
    }
  }, [serviceTypeId, serviceTypes])

  useEffect(() => {
    setRoomId((currentRoomId) => (
      currentRoomId && rooms.some((room) => String(room.id) === currentRoomId)
        ? currentRoomId
        : ''
    ))
  }, [rooms])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!selectedServiceType) {
      setError('Выберите тип услуги.')
      return
    }

    if (!roomId || !selectedRoomExists) {
      setError('Выберите кабинет')
      return
    }

    await onSubmit({
      patientName: patientName.trim() || 'Пациент',
      priority,
      roomId,
      serviceType: selectedServiceType.code,
      serviceTypeId: selectedServiceType.id,
      notes: notes.trim() || undefined,
    })

    setPatientName('')
    setNotes('')
    setPriority('normal')
    setServiceTypeId(String(serviceTypes[0]?.id ?? ''))
    setRoomId('')
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
        <label className="field service-type-field">
          <span>{t.tickets.serviceType}</span>
          <select
            disabled={loading || optionsLoading || serviceTypes.length === 0}
            onChange={(event) => {
              setServiceTypeId(event.target.value)
              setRoomId('')
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
            disabled={loading || optionsLoading || rooms.length === 0}
            onChange={(event) => setRoomId(event.target.value)}
            value={roomId}
          >
            <option value="">Выберите кабинет</option>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {formatRoomName(room)}
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
        disabled={loading || optionsLoading || !canCreateTicket}
        icon={<ClipboardPlus size={18} />}
        type="submit"
        variant="primary"
      >
        {t.tickets.createTicket}
      </Button>
    </form>
  )
}
