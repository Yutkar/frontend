import { Printer } from 'lucide-react'
import { getLocale, useLocale, type SmartQLanguage } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { formatPeopleAhead } from '@shared/utils'

export type TicketPrintData = {
  date: Date
  doctorName?: string
  language?: SmartQLanguage
  peopleAhead?: number
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
  const currentLocale = useLocale()

  if (!data) {
    return (
      <div className="ticket-print-empty">
        <span className="eyebrow">{currentLocale.ticketPrint.title}</span>
        <h2>{currentLocale.ticketPrint.emptyTitle}</h2>
        <p>{currentLocale.ticketPrint.emptyDescription}</p>
      </div>
    )
  }

  const locale = getLocale(data.language)
  const labels = locale.ticketPrint
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
        <div className="ticket-print-number">
          <span>{labels.ticketNumber}</span>
          <strong>{data.ticketNumber}</strong>
        </div>

        <dl>
          <div>
            <dt>{labels.service}</dt>
            <dd>{data.serviceName}</dd>
          </div>
          <div>
            <dt>{labels.servicePlace}</dt>
            <dd>{data.roomName}</dd>
          </div>
          {data.peopleAhead !== undefined ? (
            <div>
              <dt>{labels.queue}</dt>
              <dd>{formatPeopleAhead(data.peopleAhead, data.language)}</dd>
            </div>
          ) : null}
          {data.doctorName ? (
            <div>
              <dt>{labels.doctor}</dt>
              <dd>{data.doctorName}</dd>
            </div>
          ) : null}
          <div>
            <dt>{labels.priority}</dt>
            <dd>{data.priorityLabel}</dd>
          </div>
          <div>
            <dt>{labels.date}</dt>
            <dd>{formattedDate}</dd>
          </div>
          <div>
            <dt>{labels.time}</dt>
            <dd>{formattedTime}</dd>
          </div>
        </dl>

        <p>{labels.waitBoard}</p>
      </div>

      <Button
        className="ticket-print-button"
        icon={<Printer size={17} />}
        onClick={handlePrint}
        variant="secondary"
      >
        {labels.printButton}
      </Button>
    </section>
  )
}
