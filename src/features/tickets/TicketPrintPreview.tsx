import { Printer } from 'lucide-react'
import { Button } from '@shared/ui/components'

export type TicketPrintData = {
  date: Date
  doctorName?: string
  priorityLabel: string
  roomName: string
  serviceName: string
  ticketNumber: string
}

type TicketPrintPreviewProps = {
  data?: TicketPrintData
  onPrint?: () => void
}

export function TicketPrintPreview({ data, onPrint }: TicketPrintPreviewProps) {
  if (!data) {
    return (
      <div className="ticket-print-empty">
        <span className="eyebrow">Печать талона</span>
        <h2>Талон ещё не создан</h2>
        <p>После создания здесь появится готовый чек для печати через автомат.</p>
      </div>
    )
  }

  const formattedDate = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data.date)
  const formattedTime = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.date)

  function handlePrint() {
    window.print()
    onPrint?.()
  }

  return (
    <section className="ticket-print-panel">
      <div className="ticket-print-preview">
        <strong className="ticket-print-brand">SmartQ</strong>
        <h2>ТАЛОН № {data.ticketNumber}</h2>

        <dl>
          <div>
            <dt>Услуга:</dt>
            <dd>{data.serviceName}</dd>
          </div>
          <div>
            <dt>Кабинет:</dt>
            <dd>{data.roomName}</dd>
          </div>
          {data.doctorName ? (
            <div>
              <dt>Врач:</dt>
              <dd>{data.doctorName}</dd>
            </div>
          ) : null}
          <div>
            <dt>Приоритет:</dt>
            <dd>{data.priorityLabel}</dd>
          </div>
          <div>
            <dt>Дата:</dt>
            <dd>{formattedDate}</dd>
          </div>
          <div>
            <dt>Время:</dt>
            <dd>{formattedTime}</dd>
          </div>
        </dl>

        <p>Ожидайте вызова на табло</p>
      </div>

      <Button
        className="ticket-print-button"
        icon={<Printer size={17} />}
        onClick={handlePrint}
        variant="secondary"
      >
        Печать талона
      </Button>
    </section>
  )
}
