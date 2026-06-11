import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  PlusCircle,
  RotateCcw,
  SlidersHorizontal,
  UserX,
  XCircle,
} from 'lucide-react'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { TicketManualCreateModal } from '@features/tickets/TicketManualCreateModal'
import { TicketSettingsModal } from '@features/tickets/TicketSettingsModal'
import {
  getPriorityLabel,
  getRooms,
  getServiceOptionLabel,
  getServiceTypes,
  getSpecialists,
  getStatusLabel,
  ticketPriorities,
  ticketStatuses,
} from '@features/tickets/ticketFormOptions'
import type { TicketSettingsOptions } from '@services/api'
import { ticketService } from '@services/ticketService'
import { t } from '@shared/locales/useLocale'
import type { Ticket, TicketPriority, TicketStatus } from '@shared/types'
import { Button, QueueTableBase, TicketCard } from '@shared/ui/components'
import { formatRoomName, getWaitingMinutes, useCurrentTime } from '@shared/utils'
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

type TicketFilterState = {
  doctorId: string
  priority: string
  roomId: string
  serviceTypeId: string
  status: string
  ticketNumber: string
}

const emptyTicketFilters: TicketFilterState = {
  doctorId: '',
  priority: '',
  roomId: '',
  serviceTypeId: '',
  status: '',
  ticketNumber: '',
}

const emptyFilterOptions: TicketSettingsOptions = {
  rooms: [],
  serviceTypes: [],
  specialists: [],
}

function normalizeFilterValue(value?: string | number | null): string {
  return value == null ? '' : String(value)
}

function isTicketCreatedToday(ticket: Ticket, now: number): boolean {
  const createdAt = new Date(ticket.createdAt)

  if (!Number.isFinite(createdAt.getTime())) {
    return false
  }

  const today = new Date(now)

  return createdAt.getFullYear() === today.getFullYear() &&
    createdAt.getMonth() === today.getMonth() &&
    createdAt.getDate() === today.getDate()
}

function getTicketServiceOptionLabel(ticket: Ticket, options: TicketSettingsOptions): string {
  const serviceType = options.serviceTypes.find((item) => (
    normalizeFilterValue(item.id) === normalizeFilterValue(ticket.serviceTypeId) ||
    item.code === ticket.serviceType
  ))

  return serviceType
    ? getServiceOptionLabel(serviceType)
    : getServiceOptionLabel({
      code: ticket.serviceType,
      id: ticket.serviceTypeId ?? ticket.serviceType,
      name: '',
    })
}

export function DashboardPage() {
  useQueueBootstrap({ force: true })

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [filters, setFilters] = useState<TicketFilterState>(emptyTicketFilters)
  const [filterOptions, setFilterOptions] = useState<TicketSettingsOptions>(emptyFilterOptions)
  const [sortBy, setSortBy] = useState<QueueSort>('priority')
  const [settingsTicket, setSettingsTicket] = useState<Ticket | undefined>()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null)
  const now = useCurrentTime()

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

  const todayTickets = useMemo(
    () => tickets.filter((ticket) => isTicketCreatedToday(ticket, now)),
    [now, tickets],
  )
  const selectedTicket = todayTickets.find((ticket) => ticket.id === selectedTicketId) ?? todayTickets[0]
  const canManageTicketSettings = user?.role === 'admin' || user?.role === 'manager'
  const canMarkTicketNoShow = user?.role === 'admin' || user?.role === 'specialist'
  const visibleSuccessMessage = successMessage ?? statusMessage
  const hasActiveFilters = Object.values(filters).some((value) => value.trim() !== '')

  useEffect(() => {
    let active = true

    ticketService
      .getTicketSettingsOptions()
      .then((nextOptions) => {
        if (active) {
          setFilterOptions(nextOptions)
        }
      })
      .catch((loadError) => {
        console.error('Dashboard ticket filters load failed', loadError)
        if (active) {
          setFilterOptions(emptyFilterOptions)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const roomFilterOptions = useMemo(
    () => getRooms(filterOptions, rooms),
    [filterOptions, rooms],
  )
  const serviceFilterOptions = useMemo(
    () => getServiceTypes(filterOptions),
    [filterOptions],
  )
  const specialistFilterOptions = useMemo(
    () => getSpecialists(filterOptions),
    [filterOptions],
  )
  const showDoctorFilter = specialistFilterOptions.length > 0

  const filteredTickets = useMemo(() => {
    const ticketNumberQuery = filters.ticketNumber.trim().toLowerCase()
    const selectedServiceType = serviceFilterOptions.find(
      (serviceType) => normalizeFilterValue(serviceType.id) === filters.serviceTypeId,
    )

    return todayTickets.filter((ticket) => {
      if (filters.roomId && normalizeFilterValue(ticket.roomId) !== filters.roomId) {
        return false
      }

      if (filters.serviceTypeId) {
        const ticketServiceTypeId = normalizeFilterValue(ticket.serviceTypeId)
        const hasMatchingServiceTypeId = ticketServiceTypeId === filters.serviceTypeId
        const hasMatchingServiceCode = selectedServiceType
          ? ticket.serviceType === selectedServiceType.code
          : false

        if (!hasMatchingServiceTypeId && !hasMatchingServiceCode) {
          return false
        }
      }

      if (filters.status && ticket.status !== filters.status) {
        return false
      }

      if (filters.priority && ticket.priority !== filters.priority) {
        return false
      }

      if (filters.doctorId && normalizeFilterValue(ticket.assignedTo) !== filters.doctorId) {
        return false
      }

      if (ticketNumberQuery && !ticket.number.toLowerCase().includes(ticketNumberQuery)) {
        return false
      }

      return true
    })
  }, [filters, serviceFilterOptions, todayTickets])

  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((left, right) => {
      if (sortBy === 'eta') {
        return (getWaitingMinutes(left, now) ?? 0) - (getWaitingMinutes(right, now) ?? 0)
      }

      if (sortBy === 'status') {
        return statusOrder[left.status] - statusOrder[right.status]
      }

      return priorityOrder[left.priority] - priorityOrder[right.priority]
    })
  }, [filteredTickets, now, sortBy])

  async function handleTicketSaved() {
    await loadQueue({ force: true, successMessage: 'Талон успешно сохранён' })
    setSuccessMessage('Талон успешно сохранён')
  }

  async function handleTicketCreated() {
    await loadQueue({ force: true, successMessage: t.tickets.createdTicket })
    setSuccessMessage(t.tickets.createdTicket)
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
                  {t.tickets.createTicket}
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
            </div>
          </div>
          <div className="ticket-filters" aria-label={t.queue.filters}>
            <div className="ticket-filters-header">
              <div>
                <SlidersHorizontal size={16} />
                <span>{t.queue.filters}</span>
              </div>
              <Button
                disabled={!hasActiveFilters}
                icon={<RotateCcw size={15} />}
                onClick={() => setFilters({ ...emptyTicketFilters })}
                size="sm"
                variant="secondary"
              >
                {t.queue.resetFilters}
              </Button>
            </div>
            <div className="ticket-filters-grid">
              <label className="field">
                <span>{t.queue.servicePlace}</span>
                <select
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, roomId: event.target.value }))
                  }}
                  value={filters.roomId}
                >
                  <option value="">{t.queue.allRooms}</option>
                  {roomFilterOptions.map((room) => (
                    <option key={normalizeFilterValue(room.id)} value={normalizeFilterValue(room.id)}>
                      {formatRoomName(room)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{t.tickets.serviceType}</span>
                <select
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, serviceTypeId: event.target.value }))
                  }}
                  value={filters.serviceTypeId}
                >
                  <option value="">{t.queue.allServices}</option>
                  {serviceFilterOptions.map((serviceType) => (
                    <option
                      key={normalizeFilterValue(serviceType.id)}
                      value={normalizeFilterValue(serviceType.id)}
                    >
                      {getServiceOptionLabel(serviceType)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{t.queue.status}</span>
                <select
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, status: event.target.value }))
                  }}
                  value={filters.status}
                >
                  <option value="">{t.queue.allStatuses}</option>
                  {ticketStatuses.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{t.queue.priority}</span>
                <select
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, priority: event.target.value }))
                  }}
                  value={filters.priority}
                >
                  <option value="">{t.queue.allPriorities}</option>
                  {ticketPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {getPriorityLabel(priority)}
                    </option>
                  ))}
                </select>
              </label>

              {showDoctorFilter ? (
                <label className="field">
                  <span>{t.tickets.specialist}</span>
                  <select
                    onChange={(event) => {
                      setFilters((current) => ({ ...current, doctorId: event.target.value }))
                    }}
                    value={filters.doctorId}
                  >
                    <option value="">{t.queue.allSpecialists}</option>
                    {specialistFilterOptions.map((specialist) => (
                      <option
                        key={normalizeFilterValue(specialist.id)}
                        value={normalizeFilterValue(specialist.id)}
                      >
                        {specialist.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="field">
                <span>{t.queue.ticketNumber}</span>
                <input
                  onChange={(event) => {
                    setFilters((current) => ({ ...current, ticketNumber: event.target.value }))
                  }}
                  placeholder="A023"
                  value={filters.ticketNumber}
                />
              </label>
            </div>
          </div>
          <QueueTableBase
            actionSlot={(ticket) => {
              const isFinalTicket = closedTicketStatuses.includes(ticket.status)
              const canMarkNoShow = canMarkTicketNoShow && noShowStatuses.includes(ticket.status)
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
                  {canMarkNoShow ? (
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
            emptyTitle={hasActiveFilters ? 'По выбранным фильтрам талоны не найдены' : 'Сегодня талоны не найдены'}
            getServiceLabel={(ticket) => getTicketServiceOptionLabel(ticket, filterOptions)}
            onSelectTicket={(ticket) => selectTicket(ticket.id)}
            now={now}
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
              now={now}
              serviceLabel={getTicketServiceOptionLabel(selectedTicket, filterOptions)}
              ticket={selectedTicket}
            />
          ) : null}
          <RoomLoadWidget now={now} rooms={rooms} tickets={tickets} />
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
        onSaved={handleTicketCreated}
        open={createModalOpen}
        tickets={tickets}
      />
    </div>
  )
}
