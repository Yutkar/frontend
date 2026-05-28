import { useMemo, useState } from 'react'
import { CheckCircle2, FastForward, Play, Route } from 'lucide-react'
import type { Room, Ticket, TicketPriority } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button, TicketCard } from '@shared/ui/components'
import { getServiceTypeLabel } from '@shared/utils'
import { useQueueStore } from '@store/queue'

type SpecialistControlsProps = {
  room: Room
}

const priorityOrder: Record<TicketPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

export function SpecialistControls({ room }: SpecialistControlsProps) {
  const [redirectRoomId, setRedirectRoomId] = useState('')
  const callNextTicket = useQueueStore((state) => state.callNextTicket)
  const completeService = useQueueStore((state) => state.completeService)
  const loading = useQueueStore((state) => state.loading)
  const redirectTicket = useQueueStore((state) => state.redirectTicket)
  const rooms = useQueueStore((state) => state.rooms)
  const startService = useQueueStore((state) => state.startService)
  const tickets = useQueueStore((state) => state.tickets)

  const currentTicket = useMemo<Ticket | undefined>(
    () => tickets.find((ticket) => ticket.id === room.currentTicketId),
    [room.currentTicketId, tickets],
  )
  const waitingTickets = useMemo(
    () =>
      tickets
        .filter(
          (ticket) =>
            ticket.status === 'waiting' &&
            getServiceTypeLabel(ticket.serviceType) === room.department,
        )
        .sort((left, right) => {
          const priorityDelta = priorityOrder[left.priority] - priorityOrder[right.priority]

          if (priorityDelta !== 0) {
            return priorityDelta
          }

          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        }),
    [room.department, tickets],
  )
  const redirectRooms = rooms.filter(
    (item) => item.id !== room.id && item.status === 'open' && !item.currentTicketId,
  )

  async function handleRedirect() {
    if (!currentTicket || !redirectRoomId) {
      return
    }

    await redirectTicket({
      ticketId: currentTicket.id,
      roomId: redirectRoomId,
      reason: `${t.specialist.redirectPatient}: ${room.name}`,
    })
    setRedirectRoomId('')
  }

  return (
    <div className="specialist-workspace">
      <section className="specialist-panel specialist-current-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{room.department}</span>
            <h2>{room.name}</h2>
          </div>
          <Button
            disabled={loading || Boolean(currentTicket) || waitingTickets.length === 0}
            icon={<FastForward size={18} />}
            onClick={() => void callNextTicket(room.id)}
            variant="primary"
          >
            {t.specialist.callNext}
          </Button>
        </div>

        {currentTicket ? (
          <TicketCard
            actionSlot={
              <div className="button-row">
                <Button
                  disabled={loading || currentTicket.status !== 'called'}
                  icon={<Play size={17} />}
                  onClick={() => void startService(currentTicket.id)}
                  variant="secondary"
                >
                  {t.specialist.startService}
                </Button>
                <Button
                  disabled={loading || currentTicket.status !== 'in_service'}
                  icon={<CheckCircle2 size={17} />}
                  onClick={() => void completeService(currentTicket.id)}
                  variant="primary"
                >
                  {t.specialist.complete}
                </Button>
              </div>
            }
            room={room}
            ticket={currentTicket}
          />
        ) : (
          <div className="empty-state compact-empty">
            <span className="eyebrow">{t.specialist.ready}</span>
            <h2>{t.specialist.noActivePatient}</h2>
            <p>{t.specialist.roomAvailable}</p>
          </div>
        )}

        <div className="redirect-panel">
          <label className="field">
            <span>{t.specialist.redirectPatient}</span>
            <select
              disabled={!currentTicket}
              onChange={(event) => setRedirectRoomId(event.target.value)}
              value={redirectRoomId}
            >
              <option value="">{t.specialist.selectDestinationRoom}</option>
              {redirectRooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {item.department}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!currentTicket || !redirectRoomId || loading}
            icon={<Route size={17} />}
            onClick={() => void handleRedirect()}
            variant="secondary"
          >
            {t.specialist.redirect}
          </Button>
        </div>
      </section>

      <aside className="specialist-panel specialist-waiting-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{t.specialist.nextPatients}</span>
            <h2>{t.specialist.waitingList}</h2>
          </div>
          <strong className="waiting-count">{waitingTickets.length}</strong>
        </div>

        {waitingTickets.length > 0 ? (
          <div className="specialist-waiting-list">
            {waitingTickets.map((ticket) => (
              <TicketCard compact key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <span className="eyebrow">{room.department}</span>
            <h2>{t.specialist.waitingListEmpty}</h2>
            <p>{t.specialist.roomAvailable}</p>
          </div>
        )}
      </aside>
    </div>
  )
}
