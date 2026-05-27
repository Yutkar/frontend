import { useMemo, useState } from 'react'
import { ArrowDownUp, Radio } from 'lucide-react'
import { QueueStatusRail } from '@features/queue/QueueStatusRail'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import type { TicketPriority, TicketStatus } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button, QueueTableBase, TicketCard } from '@shared/ui/components'
import { useQueueStore } from '@store/queue'
import { DashboardKpis, RecentCallsWidget, RoomLoadWidget } from '@widgets'

type QueueSort = 'priority' | 'eta' | 'status'

const priorityOrder: Record<TicketPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

const statusOrder: Record<TicketStatus, number> = {
  waiting: 0,
  called: 1,
  in_service: 2,
  redirected: 3,
  completed: 4,
  cancelled: 5,
  no_show: 6,
}

export function QueuePage() {
  useQueueBootstrap()

  const [sortBy, setSortBy] = useState<QueueSort>('priority')
  const callNextTicket = useQueueStore((state) => state.callNextTicket)
  const events = useQueueStore((state) => state.events)
  const loading = useQueueStore((state) => state.loading)
  const rooms = useQueueStore((state) => state.rooms)
  const selectedTicketId = useQueueStore((state) => state.selectedTicketId)
  const selectTicket = useQueueStore((state) => state.selectTicket)
  const tickets = useQueueStore((state) => state.tickets)

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0]
  const dispatchRoom = rooms.find((room) => room.status === 'open') ?? rooms[0]
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((left, right) => {
      if (sortBy === 'eta') {
        return left.etaMinutes - right.etaMinutes
      }

      if (sortBy === 'status') {
        return statusOrder[left.status] - statusOrder[right.status]
      }

      return priorityOrder[left.priority] - priorityOrder[right.priority]
    })
  }, [sortBy, tickets])

  return (
    <div className="page-stack">
      <DashboardKpis />
      <QueueStatusRail tickets={tickets} />

      <section className="content-grid">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">{t.queue.system}</span>
              <h2>{t.queue.liveTicketTable}</h2>
            </div>
            <div className="queue-toolbar">
              <div className="sort-control">
                <span>
                  <ArrowDownUp size={14} />
                  {t.queue.sort}
                </span>
                {(['priority', 'eta', 'status'] as QueueSort[]).map((sort) => (
                  <button
                    className={sortBy === sort ? 'active' : ''}
                    key={sort}
                    onClick={() => setSortBy(sort)}
                    type="button"
                  >
                    {sort === 'priority'
                      ? t.queue.sortPriority
                      : sort === 'eta'
                        ? t.queue.sortEta
                        : t.queue.sortStatus}
                  </button>
                ))}
              </div>
              <Button
                disabled={!dispatchRoom || loading}
                icon={<Radio size={17} />}
                onClick={() => dispatchRoom && void callNextTicket(dispatchRoom.id)}
                variant="primary"
              >
                {t.queue.callNext}
              </Button>
            </div>
          </div>
          <QueueTableBase
            actionSlot={(ticket) => (
              <Button onClick={() => selectTicket(ticket.id)} size="sm" variant="ghost">
                {t.queue.focus}
              </Button>
            )}
            onSelectTicket={(ticket) => selectTicket(ticket.id)}
            rooms={rooms}
            tickets={sortedTickets}
          />
        </div>

        <aside className="side-column">
          {selectedTicket ? (
            <TicketCard
              room={rooms.find((room) => room.id === selectedTicket.roomId)}
              ticket={selectedTicket}
            />
          ) : null}
          <RoomLoadWidget rooms={rooms} />
          <RecentCallsWidget events={events} />
        </aside>
      </section>
    </div>
  )
}
