import { useMemo, useState } from 'react'
import {
  ArrowDownUp,
  PlusCircle,
  Radio,
  SlidersHorizontal,
  UserX,
  XCircle,
} from 'lucide-react'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { TicketManualCreateModal } from '@features/tickets/TicketManualCreateModal'
import { TicketSettingsModal } from '@features/tickets/TicketSettingsModal'
import { ticketService } from '@services/ticketService'
import { t } from '@shared/locales/useLocale'
import type { Ticket, TicketPriority, TicketStatus } from '@shared/types'
import { Button, QueueTableBase, TicketCard } from '@shared/ui/components'
import { useGlobalStore } from '@store/global'
import { useQueueStore } from '@store/queue'
import { DashboardKpis, RecentCallsWidget, RoomLoadWidget } from '@widgets'

type QueueSort = 'priority' | 'eta' | 'status'

const priorityOrder: Record<TicketPriority, number> = {
  critical: 0,
  high: 1,
  above_normal: 2,
  normal: 3,
  low: 4,
}

const statusOrder: Record<TicketStatus, number> = {
  created: 0,
  waiting: 1,
  called: 2,
  in_service: 3,
  redirected: 4,
  completed: 5,
  cancelled: 6,
  no_show: 7,
}

const closedTicketStatuses: TicketStatus[] = ['completed', 'cancelled', 'no_show']
const noShowStatuses: TicketStatus[] = ['waiting', 'called', 'redirected']

export function DashboardPage() {
  useQueueBootstrap({ force: true })

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<QueueSort>('priority')
  const [settingsTicket, setSettingsTicket] = useState<Ticket | undefined>()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null)

  const callNextTicket = useQueueStore((state) => state.callNextTicket)
  const error = useQueueStore((state) => state.error)
  const events = useQueueStore((state) => state.events)
  const hydrated = useQueueStore((state) => state.hydrated)
  const loadQueue = useQueueStore((state) => state.loadQueue)
  const loading = useQueueStore((state) => state.loading)
  const rooms = useQueueStore((state) => state.rooms)
  const selectedTicketId = useQueueStore((state) => state.selectedTicketId)
  const selectTicket = useQueueStore((state) => state.selectTicket)
  const statusMessage = useQueueStore((state) => state.statusMessage)
  const tickets = useQueueStore((state) => state.tickets)
  const user = useGlobalStore((state) => state.user)

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0]
  const dispatchRoom = rooms.find((room) => room.isActive !== false && room.status === 'open')
  const canManageTicketSettings = user?.role === 'admin' || user?.role === 'manager'
  const canUseQueueActions = user?.role === 'admin'
  const visibleSuccessMessage = successMessage ?? statusMessage

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

  async function handleTicketSaved() {
    await loadQueue({ force: true, successMessage: 'Талон успешно сохранён' })
    setSuccessMessage('Талон успешно сохранён')
  }

  async function handleTicketAction(
    ticket: Ticket,
    action: () => Promise<unknown>,
    message: string,
  ) {
    setBusyTicketId(ticket.id)
    setSuccessMessage(null)

    try {
      await action()
      await loadQueue({ force: true, successMessage: message })
      setSuccessMessage(message)
    } finally {
      setBusyTicketId(null)
    }
  }

  if (loading && !hydrated) {
    return (
      <div className="page-stack">
        <section className="empty-state">
          <span className="eyebrow">Панель управления</span>
          <h2>Загрузка данных...</h2>
          <p>Получаем актуальные талоны, кабинеты и рекомендации.</p>
        </section>
      </div>
    )
  }

  if (error && !hydrated) {
    return (
      <div className="page-stack">
        <section className="empty-state">
          <span className="eyebrow">Панель управления</span>
          <h2>Не удалось загрузить данные</h2>
          <p>Проверьте подключение к backend и попробуйте обновить страницу.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="page-stack">
      {loading ? <div className="modal-info">Загрузка данных...</div> : null}
      {error ? <div className="modal-error">Не удалось загрузить данные</div> : null}
      {!loading && !error && visibleSuccessMessage ? (
        <div className="modal-success">{visibleSuccessMessage}</div>
      ) : null}

      <DashboardKpis />

      <section className="content-grid dashboard-workspace">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">{t.queue.system}</span>
              <h2>{t.queue.liveTicketTable}</h2>
            </div>
            <div className="queue-toolbar">
              {canManageTicketSettings ? (
                <Button
                  icon={<PlusCircle size={17} />}
                  onClick={() => {
                    setSuccessMessage(null)
                    setCreateModalOpen(true)
                  }}
                  variant="secondary"
                >
                  Создать талон
                </Button>
              ) : null}
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
            actionSlot={(ticket) => {
              const isFinalTicket = closedTicketStatuses.includes(ticket.status)
              const canMarkNoShow = noShowStatuses.includes(ticket.status)
              const isBusy = busyTicketId === ticket.id || loading

              return (
                <div className="button-row queue-action-row">
                  <Button onClick={() => selectTicket(ticket.id)} size="sm" variant="ghost">
                    {t.queue.focus}
                  </Button>
                  {canManageTicketSettings ? (
                    <Button
                      icon={<SlidersHorizontal size={15} />}
                      onClick={() => {
                        setSuccessMessage(null)
                        setSettingsTicket(ticket)
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      Редактировать
                    </Button>
                  ) : null}
                  {canManageTicketSettings && canMarkNoShow ? (
                    <Button
                      disabled={isBusy}
                      icon={<UserX size={15} />}
                      onClick={() =>
                        void handleTicketAction(
                          ticket,
                          () => ticketService.noShowTicket(ticket.id),
                          'Талон отмечен как неявка',
                        )
                      }
                      size="sm"
                      variant="secondary"
                    >
                      Не явился
                    </Button>
                  ) : null}
                  {canManageTicketSettings && !isFinalTicket ? (
                    <Button
                      disabled={isBusy}
                      icon={<XCircle size={15} />}
                      onClick={() =>
                        void handleTicketAction(
                          ticket,
                          () => ticketService.cancelTicket(ticket.id),
                          'Талон отменён',
                        )
                      }
                      size="sm"
                      variant="danger"
                    >
                      Отменить
                    </Button>
                  ) : null}
                </div>
              )
            }}
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
                    onClick={() => {
                      setSuccessMessage(null)
                      setSettingsTicket(selectedTicket)
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    Редактировать
                  </Button>
                ) : null
              }
              room={rooms.find((room) => room.id === selectedTicket.roomId)}
              ticket={selectedTicket}
            />
          ) : null}
          <RoomLoadWidget rooms={rooms} tickets={tickets} />
          <RecentCallsWidget events={events} />
        </aside>
      </section>

      <TicketSettingsModal
        fallbackRooms={rooms}
        onClose={() => setSettingsTicket(undefined)}
        onSaved={handleTicketSaved}
        open={Boolean(settingsTicket)}
        ticket={settingsTicket}
      />
      <TicketManualCreateModal
        fallbackRooms={rooms}
        onClose={() => setCreateModalOpen(false)}
        onSaved={handleTicketSaved}
        open={createModalOpen}
      />
    </div>
  )
}
