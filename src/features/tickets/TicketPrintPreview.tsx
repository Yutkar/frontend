import { Printer } from 'lucide-react'
import { getLocale, type SmartQLanguage } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { formatPeopleAhead } from '@shared/utils'

export type TicketPrintData = {
  date: Date
  doctorName?: string
  estimatedWaitMinutes?: number
  language?: SmartQLanguage
  organizationName?: string
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

const intlLocaleByLanguage: Record<SmartQLanguage, string> = {
  en: 'en-US',
  kk: 'kk-KZ',
  ru: 'ru-RU',
}

function formatTicketDuration(minutes: number, language: SmartQLanguage): string {
  const roundedMinutes = Math.max(0, Math.floor(minutes))

  if (roundedMinutes < 1) {
    if (language === 'en') return 'now'
    if (language === 'kk') return 'қазір'

    return 'сейчас'
  }

  if (roundedMinutes < 60) {
    if (language === 'en') return `${roundedMinutes} min`

    return `${roundedMinutes} мин`
  }

  const hours = Math.floor(roundedMinutes / 60)
  const restMinutes = roundedMinutes % 60

  if (language === 'en') {
    return restMinutes > 0 ? `${hours} h ${restMinutes} min` : `${hours} h`
  }

  if (language === 'kk') {
    return restMinutes > 0 ? `${hours} сағ ${restMinutes} мин` : `${hours} сағ`
  }

  return restMinutes > 0 ? `${hours} ч ${restMinutes} мин` : `${hours} ч`
}

export function TicketPrintPreview({ data, onPrint }: TicketPrintPreviewProps) {
  const interfaceLocale = getLocale('ru')

  if (!data) {
    return (
      <div className="ticket-print-empty">
        <span className="eyebrow">{interfaceLocale.ticketPrint.title}</span>
        <h2>{interfaceLocale.ticketPrint.emptyTitle}</h2>
        <p>{interfaceLocale.ticketPrint.emptyDescription}</p>
      </div>
    )
  }

  const ticketLanguage = data.language ?? 'ru'
  const locale = getLocale(ticketLanguage)
  const labels = locale.ticketPrint
  const intlLocale = intlLocaleByLanguage[ticketLanguage]
  const formattedDate = new Intl.DateTimeFormat(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(data.date)
  const formattedTime = new Intl.DateTimeFormat(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.date)
  const hasEstimatedWait = data.estimatedWaitMinutes !== undefined
    && Number.isFinite(data.estimatedWaitMinutes)

  function handlePrint() {
    window.print()
    onPrint?.()
  }

  return (
    <section className="ticket-print-panel">
      <div className="ticket-print ticket-print-preview">
        {data.organizationName ? (
          <strong className="ticket-print-brand">{data.organizationName}</strong>
        ) : null}
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
          {hasEstimatedWait ? (
            <div>
              <dt>{labels.estimatedWait}</dt>
              <dd>{formatTicketDuration(data.estimatedWaitMinutes ?? 0, ticketLanguage)}</dd>
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
        className="ticket-print-button no-print"
        icon={<Printer size={17} />}
        onClick={handlePrint}
        variant="secondary"
      >
        {interfaceLocale.ticketPrint.printButton}
      </Button>
    </section>
  )
}
