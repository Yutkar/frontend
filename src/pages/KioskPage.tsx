import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { TicketPrintPreview, type TicketPrintData } from '@features/tickets/TicketPrintPreview'
import {
  getAutoRoomForService,
  getAvailableServiceTypes,
  getPriorityLabel,
  getRoomsForService,
  getServiceOptionLabel,
  getServiceTypes,
} from '@features/tickets/ticketFormOptions'
import { adminService } from '@services/adminService'
import { kioskService } from '@services/kioskService'
import { subscribeServiceTypesChanged } from '@services/serviceTypeSync'
import { ticketService } from '@services/ticketService'
import type { AdminTerminalRecord, TicketSettingsOptions, TicketSettingsRoomOption } from '@services/api'
import type { Ticket } from '@shared/types'
import { Button } from '@shared/ui/components'
import { formatRoomName } from '@shared/utils'
import { useQueueStore } from '@store/queue'

const emptyOptions: TicketSettingsOptions = {
  rooms: [],
  serviceTypes: [],
  specialists: [],
}

export function KioskPage() {
  const [searchParams] = useSearchParams()
  const terminalId = searchParams.get('terminalId') ?? ''
  const loadQueue = useQueueStore((state) => state.loadQueue)
  const queueRooms = useQueueStore((state) => state.rooms)
  const queueTickets = useQueueStore((state) => state.tickets)
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingTerminal, setLoadingTerminal] = useState(Boolean(terminalId))
  const [options, setOptions] = useState<TicketSettingsOptions>(emptyOptions)
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState('')
  const [terminal, setTerminal] = useState<AdminTerminalRecord | null>(null)

  const loadTicketOptions = useCallback(async () => {
    const nextOptions = await ticketService.getTicketSettingsOptions()

    setOptions(nextOptions)

    return nextOptions
  }, [])

  useEffect(() => {
    let active = true

    setLoadingOptions(true)
    void loadQueue({ force: true, successMessage: 'Данные киоска обновлены' })
    loadTicketOptions()
      .then((nextOptions) => {
        if (active) {
          setOptions(nextOptions)
        }
      })
      .catch((loadError) => {
        console.error('Kiosk options load failed', loadError)
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
  }, [loadQueue, loadTicketOptions])

  useEffect(() => subscribeServiceTypesChanged(() => {
    void loadQueue({ force: true, successMessage: 'Данные киоска обновлены' })
    void loadTicketOptions()
  }), [loadQueue, loadTicketOptions])

  useEffect(() => {
    let active = true

    if (!terminalId) {
      setTerminal(null)
      setLoadingTerminal(false)
      return () => {
        active = false
      }
    }

    setLoadingTerminal(true)
    adminService.getTerminals()
      .then((terminals) => {
        if (!active) return
        setTerminal(terminals.find((item) => String(item.id) === terminalId) ?? null)
      })
      .catch((terminalLoadError) => {
        console.error('Kiosk terminal load failed', terminalLoadError)
        if (active) {
          setTerminal(null)
        }
      })
      .finally(() => {
        if (active) {
          setLoadingTerminal(false)
        }
      })

    return () => {
      active = false
    }
  }, [terminalId])

  function filterTerminalRooms(rooms: TicketSettingsRoomOption[], nextTerminal: AdminTerminalRecord | null) {
    if (!terminalId) {
      return rooms
    }

    if (!nextTerminal?.active) {
      return []
    }

    const allowedRoomIds = new Set(nextTerminal.roomIds.map(String))

    return rooms.filter((room) => allowedRoomIds.has(String(room.id)))
  }

  const serviceTypes = useMemo(
    () => {
      const availableServiceTypes = getAvailableServiceTypes(options, queueRooms, queueTickets)

      if (!terminalId) {
        return availableServiceTypes
      }

      if (!terminal?.active) {
        return []
      }

      const allowedServiceTypeIds = new Set(terminal.serviceTypeIds.map(String))

      return availableServiceTypes.filter((serviceType) => {
        if (!allowedServiceTypeIds.has(String(serviceType.id))) {
          return false
        }

        const serviceRooms = filterTerminalRooms(
          getRoomsForService(options, serviceType.id, queueRooms),
          terminal,
        )

        return Boolean(getAutoRoomForService(serviceRooms, queueRooms, queueTickets))
      })
    },
    [options, queueRooms, queueTickets, terminal, terminalId],
  )
  const selectedServiceType = serviceTypes.find(
    (serviceType) => String(serviceType.id) === selectedServiceTypeId,
  )
  const rooms = useMemo(
    () => filterTerminalRooms(getRoomsForService(options, selectedServiceType?.id, queueRooms), terminal),
    [options, queueRooms, selectedServiceType?.id, terminal, terminalId],
  )
  const selectedRoom = useMemo(
    () => getAutoRoomForService(rooms, queueRooms, queueTickets),
    [queueRooms, queueTickets, rooms],
  )

  useEffect(() => {
    const selectedServiceAvailable = serviceTypes.some(
      (serviceType) => String(serviceType.id) === selectedServiceTypeId,
    )

    if ((!selectedServiceTypeId || !selectedServiceAvailable) && serviceTypes[0]) {
      setSelectedServiceTypeId(String(serviceTypes[0].id))
    }

    if (serviceTypes.length === 0 && selectedServiceTypeId) {
      setSelectedServiceTypeId('')
    }
  }, [selectedServiceTypeId, serviceTypes])

  useEffect(() => {
    if (!createdTicket) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      resetKiosk()
    }, 9000)

    return () => window.clearTimeout(timeoutId)
  }, [createdTicket])

  const printData = useMemo<TicketPrintData | undefined>(() => {
    if (!createdTicket) {
      return undefined
    }

    const room = rooms.find((item) => String(item.id) === createdTicket.roomId)

    return {
      date: new Date(createdTicket.createdAt),
      priorityLabel: getPriorityLabel(createdTicket.priority),
      roomName: formatRoomName(room ?? { id: createdTicket.roomId, name: createdTicket.roomName }),
      serviceName: selectedServiceType
        ? getServiceOptionLabel(selectedServiceType)
        : 'Консультация',
      ticketNumber: createdTicket.number,
    }
  }, [createdTicket, rooms, selectedServiceType])

  function resetKiosk() {
    setCreatedTicket(null)
    setError(null)
    setLoading(false)
  }

  async function handleCreateTicket() {
    if (!selectedServiceType || !selectedRoom || loading) {
      return
    }

    setError(null)
    setLoading(true)

    try {
      await loadQueue({ force: true, successMessage: 'Данные киоска обновлены' })
      const latestOptions = await loadTicketOptions()
      const latestRooms = useQueueStore.getState().rooms
      const latestTickets = useQueueStore.getState().tickets
      const latestTerminal = terminalId
        ? (await adminService.getTerminals()).find((item) => String(item.id) === terminalId) ?? null
        : null
      const latestServiceType = getServiceTypes(latestOptions).find(
        (serviceType) => String(serviceType.id) === String(selectedServiceType.id),
      )
      const latestServiceRooms = filterTerminalRooms(
        getRoomsForService(latestOptions, latestServiceType?.id, latestRooms),
        latestTerminal,
      )
      const latestRoom = getAutoRoomForService(latestServiceRooms, latestRooms, latestTickets)

      if (!latestServiceType || !latestRoom) {
        setError('Нет доступных мест обслуживания для выбранной услуги')
        return
      }

      const ticket = await kioskService.createTicketForKiosk({
        priority: 'normal',
        roomId: latestRoom.id,
        serviceType: latestServiceType.code,
        serviceTypeId: latestServiceType.id,
        status: 'waiting',
      })

      setCreatedTicket(ticket)
      void loadQueue({ force: true, successMessage: 'Данные успешно обновлены' })
    } catch (createError) {
      console.error('Kiosk ticket create failed', createError)
      setError('Не удалось создать талон. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  if (createdTicket) {
    return (
      <main className="kiosk-page">
        <section className="kiosk-result">
          <CheckCircle2 aria-hidden="true" size={72} />
          <span className="kiosk-result-label">Ваш талон создан</span>
          <div className="kiosk-ticket-number">
            <span>Номер талона</span>
            <strong>{createdTicket.number}</strong>
          </div>
          <TicketPrintPreview data={printData} onPrint={resetKiosk} />
          <Button
            className="kiosk-back-button"
            icon={<ArrowLeft size={20} />}
            onClick={resetKiosk}
            size="lg"
            variant="secondary"
          >
            Назад
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="kiosk-page">
      <section className="kiosk-shell">
        <div className="kiosk-heading">
          <strong>SmartQ</strong>
          <h1>Выберите услугу</h1>
        </div>

        {error ? <div className="modal-error">{error}</div> : null}
        {!loadingOptions && !loadingTerminal && serviceTypes.length === 0 ? (
          <div className="modal-error">Сейчас нет доступных услуг. Обратитесь к администратору.</div>
        ) : null}
        {selectedServiceType && !selectedRoom ? (
          <div className="modal-error">Нет доступных мест обслуживания для выбранной услуги</div>
        ) : null}

        <div className="kiosk-service-grid">
          {serviceTypes.map((serviceType) => {
            const id = String(serviceType.id)
            const selected = id === String(selectedServiceType?.id)

            return (
              <button
                className={selected ? 'kiosk-service-button active' : 'kiosk-service-button'}
                disabled={loading || loadingOptions || loadingTerminal}
                key={id}
                onClick={() => setSelectedServiceTypeId(id)}
                type="button"
              >
                {getServiceOptionLabel(serviceType)}
              </button>
            )
          })}
        </div>

        <Button
          className="kiosk-submit"
          disabled={loading || loadingOptions || loadingTerminal || !selectedServiceType || !selectedRoom}
          onClick={handleCreateTicket}
          size="lg"
          variant="primary"
        >
          {loading ? 'Создаём талон...' : 'Получить талон'}
        </Button>
      </section>
    </main>
  )
}
