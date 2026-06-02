import { useMemo } from 'react'
import { CheckCircle2, FastForward, Play, UserX } from 'lucide-react'
import type { Room, Ticket, TicketPriority } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button, TicketCard } from '@shared/ui/components'
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

const specialistVisibleStatuses = ['waiting', 'called', 'in_service', 'redirected'] as const

export function SpecialistControls({ room }: SpecialistControlsProps) {
  const callNextTicket = useQueueStore((state) => state.callNextTicket)
  const completeService = useQueueStore((state) => state.completeService)
  const loading = useQueueStore((state) => state.loading)
  const skipTicket = useQueueStore((state) => state.skipTicket)
  const startService = useQueueStore((state) => state.startService)
  const tickets = useQueueStore((state) => state.tickets)

  // ИСПРАВЛЕНО: Убрана фильтрация по roomId, так как метод loadRoomQueue 
  // уже загружает в стор только талоны текущего кабинета.
  // Теперь мы фильтруем только по статусу.
  const roomTickets = useMemo(
    () =>
      tickets.filter((ticket) =>
        specialistVisibleStatuses.includes(ticket.status as (typeof specialistVisibleStatuses)[number]),
      ),
    [tickets],
  )

  const currentTicket = useMemo<Ticket | undefined>(
    () =>
      roomTickets.find((ticket) => ['called', 'in_service'].includes(ticket.status)) ??
      roomTickets.find((ticket) => ticket.id === room.currentTicketId),
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
                <Button disabled={loading || currentTicket.status !== 'called'} icon={<Play size={17} />} onClick={() => void startService(currentTicket.id)} variant="secondary">
                  {t.specialist.startService}
                </Button>
                <Button disabled={loading || currentTicket.status !== 'in_service'} icon={<CheckCircle2 size={17} />} onClick={() => void completeService(currentTicket.id)} variant="primary">
                  {t.specialist.complete}
                </Button>
                <Button disabled={loading || currentTicket.status !== 'in_service'} icon={<UserX size={17} />} onClick={() => void skipTicket(currentTicket.id)} variant="danger">
                  Пропустить (неявка)
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
          </div>
        )}
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
            <h2>{t.specialist.waitingListEmpty}</h2>
          </div>
        )}
      </aside>
    </div>
  )
}
