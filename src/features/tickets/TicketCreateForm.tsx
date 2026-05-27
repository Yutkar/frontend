import { useState, type FormEvent } from 'react'
import { ClipboardPlus } from 'lucide-react'
import type { ServiceType, TicketCreateInput, TicketPriority } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { getPriorityMeta, getServiceTypeLabel } from '@shared/utils'

const serviceTypes: ServiceType[] = [
  'registration',
  'consultation',
  'diagnostics',
  'laboratory',
  'pharmacy',
  'billing',
]

const priorities: TicketPriority[] = ['low', 'normal', 'high', 'critical']

type TicketCreateFormProps = {
  loading: boolean
  onSubmit: (input: TicketCreateInput) => Promise<void>
}

export function TicketCreateForm({ loading, onSubmit }: TicketCreateFormProps) {
  const [patientName, setPatientName] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('normal')
  const [serviceType, setServiceType] = useState<ServiceType>('registration')
  const [notes, setNotes] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!patientName.trim()) {
      return
    }

    await onSubmit({
      patientName: patientName.trim(),
      priority,
      serviceType,
      notes: notes.trim() || undefined,
    })

    setPatientName('')
    setNotes('')
    setPriority('normal')
    setServiceType('registration')
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
        <label className="field">
          <span>{t.tickets.serviceType}</span>
          <select
            onChange={(event) => setServiceType(event.target.value as ServiceType)}
            value={serviceType}
          >
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {getServiceTypeLabel(type)}
              </option>
            ))}
          </select>
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

      <Button
        disabled={loading || !patientName.trim()}
        icon={<ClipboardPlus size={18} />}
        type="submit"
        variant="primary"
      >
        {t.tickets.createTicket}
      </Button>
    </form>
  )
}
