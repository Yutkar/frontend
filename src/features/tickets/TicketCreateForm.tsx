import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ClipboardPlus } from 'lucide-react'
import { ticketService } from '@services/ticketService'
import { subscribeServiceTypesChanged } from '@services/serviceTypeSync'
import type { TicketSettingsOptions } from '@services/api'
import type { Room, Ticket, TicketCreateInput, TicketPriority } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { formatRoomName, getPriorityMeta } from '@shared/utils'
import {
  getRoomsForService,
  getServiceOptionLabel,
  getServiceTypes,
  isRoomAvailableForTicket,
} from './ticketFormOptions'

const priorities: TicketPriority[] = ['low', 'normal', 'high', 'critical']

type TicketCreateFormProps = {
  fallbackRooms?: Room[]
  loading: boolean
  onSubmit: (input: TicketCreateInput) => Promise<void>
  tickets?: Ticket[]
}

const emptyOptions: TicketSettingsOptions = {
  rooms: [],
  serviceTypes: [],
  specialists: [],
}

export function TicketCreateForm({
  fallbackRooms = [],
  loading,
  onSubmit,
  tickets = [],
}: TicketCreateFormProps) {
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
    () => getRoomsForService(options, selectedServiceType?.id, fallbackRooms)
      .filter((room) => isRoomAvailableForTicket(
        room,
        fallbackRooms,
        tickets,
        selectedServiceType?.averageDurationMinutes ?? 10,
      )),
    [fallbackRooms, options, selectedServiceType?.averageDurationMinutes, selectedServiceType?.id, tickets],
  )
  const selectedRoomExists = useMemo(
    () => rooms.some((room) => String(room.id) === roomId),
    [roomId, rooms],
  )
  const canCreateTicket = Boolean(selectedServiceType && selectedRoomExists && priority)

  const loadOptions = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setOptionsLoading(true)
    }
    setError(null)

    try {
      setOptions(await ticketService.getTicketSettingsOptions())
    } catch (loadError) {
      console.error('Ticket create options load failed', loadError)
      setOptions(emptyOptions)
      setError('Не удалось загрузить услуги и кабинеты. Проверьте подключение к серверу.')
    } finally {
      setOptionsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  useEffect(() => subscribeServiceTypesChanged(() => {
    void loadOptions(false)
  }), [loadOptions])

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
      setError('Выберите место обслуживания')
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
          <span>Место обслуживания</span>
          <select
            disabled={loading || optionsLoading || rooms.length === 0}
            onChange={(event) => setRoomId(event.target.value)}
            value={roomId}
          >
            <option value="">Выберите место обслуживания</option>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {formatRoomName(room)}
                </option>
              ))
            ) : (
              <option value="">Нет доступных мест обслуживания</option>
            )}
          </select>
          {selectedServiceType && rooms.length === 0 ? (
            <small className="field-hint">Нет доступных мест обслуживания для выбранной услуги</small>
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
