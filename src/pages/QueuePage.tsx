import { useMemo, useState } from 'react'
import { ArrowDownUp, Radio, SlidersHorizontal } from 'lucide-react'
import { QueueStatusRail } from '@features/queue/QueueStatusRail'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { TicketSettingsModal } from '@features/tickets/TicketSettingsModal'
import type { Ticket, TicketPriority, TicketStatus } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button, QueueTableBase, TicketCard } from '@shared/ui/components'
import { useGlobalStore } from '@store/global'
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
  created: 0,
  waiting: 1,
  called: 2,
  in_service: 3,
  completed: 4,
  redirected: 5,
  cancelled: 6,
  no_show: 7,
}

export function QueuePage() {
  useQueueBootstrap()

  const [sortBy, setSortBy] = useState<QueueSort>('priority')
  const [settingsTicket, setSettingsTicket] = useState<Ticket | undefined>()
  const callNextTicket = useQueueStore((state) => state.callNextTicket)
  const events = useQueueStore((state) => state.events)
  const loadQueue = useQueueStore((state) => state.loadQueue)
  const loading = useQueueStore((state) => state.loading)
  const rooms = useQueueStore((state) => state.rooms)
  const selectedTicketId = useQueueStore((state) => state.selectedTicketId)
  const selectTicket = useQueueStore((state) => state.selectTicket)
  const tickets = useQueueStore((state) => state.tickets)
  const user = useGlobalStore((state) => state.user)

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0]
  const dispatchRoom = rooms.find((room) => room.status === 'open') ?? rooms[0]
  const canManageTicketSettings = user?.role === 'admin' || user?.role === 'manager'
  const canUseQueueActions = user?.role === 'admin'
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
              {canUseQueueActions ? (
                <Button
                  disabled={!dispatchRoom || loading}
                  icon={<Radio size={17} />}
                  onClick={() => dispatchRoom && void callNextTicket(dispatchRoom.id)}
                  variant="primary"
                >
                  {t.queue.callNext}
                </Button>
              ) : null}
            </div>
          </div>
          <QueueTableBase
            actionSlot={(ticket) => (
              <div className="button-row">
                <Button onClick={() => selectTicket(ticket.id)} size="sm" variant="ghost">
                  {t.queue.focus}
                </Button>
                {canManageTicketSettings ? (
                  <Button
                    icon={<SlidersHorizontal size={15} />}
                    onClick={() => setSettingsTicket(ticket)}
                    size="sm"
                    variant="secondary"
                  >
                    Настройки
                  </Button>
                ) : null}
              </div>
            )}
            onSelectTicket={(ticket) => selectTicket(ticket.id)}
            rooms={rooms}
            tickets={sortedTickets}
          />
        </div>

        <aside className="side-column">
          {selectedTicket ? (
            <TicketCard
              actionSlot={
                canManageTicketSettings ? (
                  <Button
                    icon={<SlidersHorizontal size={16} />}
                    onClick={() => setSettingsTicket(selectedTicket)}
                    size="sm"
                    variant="secondary"
                  >
                    Настройки
                  </Button>
                ) : null
              }
              room={rooms.find((room) => room.id === selectedTicket.roomId)}
              ticket={selectedTicket}
            />
          ) : null}
          <RoomLoadWidget rooms={rooms} />
          <RecentCallsWidget events={events} />
        </aside>
      </section>

      <TicketSettingsModal
        fallbackRooms={rooms}
        onClose={() => setSettingsTicket(undefined)}
        onSaved={loadQueue}
        open={Boolean(settingsTicket)}
        ticket={settingsTicket}
      />
    </div>
  )
}
