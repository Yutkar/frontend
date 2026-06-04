import { useMemo, useState } from 'react'
import { CheckCircle2, FastForward, Play, RotateCcw, UserX } from 'lucide-react'
import { ticketService } from '@services/ticketService'
import type { Room, Ticket, TicketPriority } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button, TicketCard } from '@shared/ui/components'
import { useCurrentTime } from '@shared/utils'
import { useQueueStore } from '@store/queue'

type SpecialistControlsProps = {
  room: Room
}

const priorityOrder: Record<TicketPriority, number> = {
  critical: 0,
  high: 1,
  above_normal: 2,
  normal: 3,
  low: 4,
}

const specialistVisibleStatuses = ['waiting', 'called', 'in_service', 'no_show', 'redirected'] as const

export function SpecialistControls({ room }: SpecialistControlsProps) {
  const [returnError, setReturnError] = useState<string | null>(null)
  const [returningTicketId, setReturningTicketId] = useState<string | null>(null)
  const callNextTicket = useQueueStore((state) => state.callNextTicket)
  const completeService = useQueueStore((state) => state.completeService)
  const loadQueue = useQueueStore((state) => state.loadQueue)
  const loading = useQueueStore((state) => state.loading)
  const skipTicket = useQueueStore((state) => state.skipTicket)
  const startService = useQueueStore((state) => state.startService)
  const tickets = useQueueStore((state) => state.tickets)
  const now = useCurrentTime()

  const roomTickets = useMemo(
    () =>
      tickets.filter((ticket) =>
        String(ticket.roomId) === String(room.id) &&
        specialistVisibleStatuses.includes(ticket.status as (typeof specialistVisibleStatuses)[number]),
      ),
    [room.id, tickets],
  )

  const currentTicket = useMemo<Ticket | undefined>(
    () =>
      roomTickets.find(
        (ticket) =>
          ticket.id === room.currentTicketId &&
          ['called', 'in_service'].includes(ticket.status),
      ) ??
      roomTickets.find((ticket) => ['called', 'in_service'].includes(ticket.status)),
    [room.currentTicketId, roomTickets],
  )

  const waitingTickets = useMemo(
    () =>
      roomTickets
        .filter(
          (ticket) =>
            ticket.status === 'waiting' ||
            ticket.status === 'redirected',
        )
        .sort((left, right) => {
          const priorityDelta = priorityOrder[left.priority] - priorityOrder[right.priority]
          if (priorityDelta !== 0) return priorityDelta
          return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        }),
    [roomTickets],
  )
  const noShowTickets = useMemo(
    () =>
      roomTickets
        .filter((ticket) => ticket.status === 'no_show')
        .sort((left, right) => {
          const leftDate = left.updatedAt ?? left.calledAt ?? left.createdAt
          const rightDate = right.updatedAt ?? right.calledAt ?? right.createdAt

          return new Date(rightDate).getTime() - new Date(leftDate).getTime()
        }),
    [roomTickets],
  )

  const handleReturnTicket = async (ticketId: string) => {
    setReturnError(null)
    setReturningTicketId(ticketId)

    try {
      await ticketService.returnTicket(ticketId)
      await loadQueue({ force: true, successMessage: 'Пациент возвращён в лист ожидания' })
    } catch (error) {
      console.error('Specialist return ticket failed', error)
      setReturnError(
        error instanceof Error ? error.message : 'Не удалось вернуть пациента в очередь',
      )
    } finally {
      setReturningTicketId(null)
    }
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
                {currentTicket.status === 'called' ? (
                  <>
                    <Button disabled={loading} icon={<Play size={17} />} onClick={() => void startService(currentTicket.id)} variant="secondary">
                      {t.specialist.startService}
                    </Button>
                    <Button disabled={loading} icon={<UserX size={17} />} onClick={() => void skipTicket(currentTicket.id)} variant="danger">
                      {t.specialist.noShow}
                    </Button>
                  </>
                ) : null}
                {currentTicket.status === 'in_service' ? (
                  <Button disabled={loading} icon={<CheckCircle2 size={17} />} onClick={() => void completeService(currentTicket.id)} variant="primary">
                    {t.specialist.complete}
                  </Button>
                ) : null}
              </div>
            }
            now={now}
            room={room}
            ticket={currentTicket}
          />
        ) : (
          <div className="empty-state compact-empty">
            <span className="eyebrow">{t.specialist.ready}</span>
            <h2>{t.specialist.noActivePatient}</h2>
          </div>
        )}
      </section>

      <aside className="specialist-panel specialist-waiting-panel">
        <section className="specialist-side-section">
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
                <TicketCard compact key={ticket.id} now={now} ticket={ticket} />
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <h2>{t.specialist.waitingListEmpty}</h2>
            </div>
          )}
        </section>

        <section className="specialist-side-section">
          <div className="panel-header">
            <div>
              <span className="eyebrow">{t.specialist.returnPatientQueue}</span>
              <h2>{t.specialist.noShowPatients}</h2>
            </div>
            <strong className="waiting-count">{noShowTickets.length}</strong>
          </div>

          {returnError ? <div className="modal-error">{returnError}</div> : null}

          {noShowTickets.length > 0 ? (
            <div className="specialist-waiting-list">
              {noShowTickets.map((ticket) => (
                <TicketCard
                  actionSlot={
                    <div className="button-row">
                      <Button
                        disabled={loading || returningTicketId === ticket.id}
                        icon={<RotateCcw size={17} />}
                        onClick={() => void handleReturnTicket(ticket.id)}
                        variant="secondary"
                      >
                        {t.specialist.returnPatient}
                      </Button>
                    </div>
                  }
                  compact
                  key={ticket.id}
                  now={now}
                  ticket={ticket}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <h2>{t.specialist.noShowListEmpty}</h2>
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}
