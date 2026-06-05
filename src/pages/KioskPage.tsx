import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { TicketPrintPreview, type TicketPrintData } from '@features/tickets/TicketPrintPreview'
import {
  getPriorityLabel,
  getRoomsForService,
  getServiceOptionLabel,
  getServiceTypes,
} from '@features/tickets/ticketFormOptions'
import { kioskService } from '@services/kioskService'
import { ticketService } from '@services/ticketService'
import type { TicketSettingsOptions } from '@services/api'
import type { Ticket } from '@shared/types'
import { Button } from '@shared/ui/components'
import { useQueueStore } from '@store/queue'

const emptyOptions: TicketSettingsOptions = {
  rooms: [],
  serviceTypes: [],
  specialists: [],
}

export function KioskPage() {
  const loadQueue = useQueueStore((state) => state.loadQueue)
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [options, setOptions] = useState<TicketSettingsOptions>(emptyOptions)
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState('')

  const loadTicketOptions = useCallback(async () => {
    const nextOptions = await ticketService.getTicketSettingsOptions()

    setOptions(nextOptions)

    return nextOptions
  }, [])

  useEffect(() => {
    let active = true

    setLoadingOptions(true)
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
  }, [loadTicketOptions])

  const serviceTypes = useMemo(() => getServiceTypes(options), [options])
  const selectedServiceType = serviceTypes.find(
    (serviceType) => String(serviceType.id) === selectedServiceTypeId,
  ) ?? serviceTypes[0]
  const rooms = useMemo(
    () => getRoomsForService(options, selectedServiceType?.id),
    [options, selectedServiceType?.id],
  )
  const selectedRoom = rooms[0]

  useEffect(() => {
    if (!selectedServiceTypeId && serviceTypes[0]) {
      setSelectedServiceTypeId(String(serviceTypes[0].id))
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
      roomName: room?.name ?? 'Не назначен',
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
      const latestOptions = await loadTicketOptions()
      const latestServiceType = getServiceTypes(latestOptions).find(
        (serviceType) => String(serviceType.id) === String(selectedServiceType.id),
      )
      const latestRoom = getRoomsForService(latestOptions, latestServiceType?.id)[0]

      if (!latestServiceType || !latestRoom) {
        setError('Нет доступных кабинетов для выбранной услуги')
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
        {selectedServiceType && rooms.length === 0 ? (
          <div className="modal-error">Нет доступных кабинетов для выбранной услуги</div>
        ) : null}

        <div className="kiosk-service-grid">
          {serviceTypes.map((serviceType) => {
            const id = String(serviceType.id)
            const selected = id === String(selectedServiceType?.id)

            return (
              <button
                className={selected ? 'kiosk-service-button active' : 'kiosk-service-button'}
                disabled={loading || loadingOptions}
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
          disabled={loading || loadingOptions || !selectedServiceType || !selectedRoom}
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
