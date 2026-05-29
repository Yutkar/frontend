import { useEffect, useState } from 'react'
import { CheckCircle2, Ticket } from 'lucide-react'
import { kioskService, type KioskTicket } from '@services/kioskService'
import { serviceTypeOptions } from '@shared/constants/serviceTypes'
import type { ServiceType } from '@shared/types'
import { getServiceTypeLabel } from '@shared/utils'
import { Button } from '@shared/ui/components'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось создать талон.'
}

export function KioskPage() {
  const [createdTicket, setCreatedTicket] = useState<KioskTicket>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [serviceTypeId, setServiceTypeId] = useState<ServiceType>('consultation')

  useEffect(() => {
    if (!createdTicket) {
      return undefined
    }

    const timerId = window.setTimeout(() => {
      setCreatedTicket(undefined)
      setError(undefined)
    }, 5000)

    return () => window.clearTimeout(timerId)
  }, [createdTicket])

  async function handleCreateTicket() {
    setLoading(true)
    setError(undefined)

    try {
      setCreatedTicket(await kioskService.createTicket(serviceTypeId))
    } catch (createError) {
      setError(getErrorMessage(createError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="kiosk-page">
      <section className="kiosk-panel">
        <div className="kiosk-brand">
          <div className="brand-mark">SQ</div>
          <h1>Киоск SmartQ</h1>
        </div>

        {createdTicket ? (
          <div className="kiosk-success">
            <CheckCircle2 size={56} />
            <span>Ваш номер</span>
            <strong>{createdTicket.number}</strong>
            <p>{getServiceTypeLabel(createdTicket.serviceType)}</p>
          </div>
        ) : (
          <>
            <div className="kiosk-service-grid">
              {serviceTypeOptions.map((serviceType) => (
                <button
                  className={serviceTypeId === serviceType.id ? 'selected' : ''}
                  key={serviceType.id}
                  onClick={() => setServiceTypeId(serviceType.id)}
                  type="button"
                >
                  {serviceType.label}
                </button>
              ))}
            </div>

            {error ? <div className="architecture-resource-banner architecture-resource-error">{error}</div> : null}

            <Button
              className="kiosk-submit"
              disabled={loading}
              icon={<Ticket size={26} />}
              onClick={() => void handleCreateTicket()}
              size="lg"
              variant="primary"
            >
              Получить талон
            </Button>
          </>
        )}
      </section>
    </main>
  )
}
