import { create } from 'zustand'
import { getApiErrorMessage, queueApi } from '@services/api'
import type {
  AnalyticsPoint,
  QueueEvent,
  QueueKpi,
  QueueRecommendation,
  RedirectTicketInput,
  Room,
  Ticket,
  TicketCreateInput,
} from '@shared/types'

type QueueState = {
  analytics: AnalyticsPoint[]
  activeTickets: Ticket[]
  error: string | null
  events: QueueEvent[]
  hydrated: boolean
  kpi: QueueKpi
  lastUpdatedAt?: string
  loading: boolean
  noShowTickets: Ticket[]
  recommendations: QueueRecommendation[]
  returnedTicketOverrides: Record<string, Ticket>
  rooms: Room[]
  selectedTicketId?: string
  statusMessage: string | null
  tickets: Ticket[]
  callNextTicket: (roomId: string) => Promise<void>
  completeService: (ticketId: string) => Promise<void>
  createTicket: (input: TicketCreateInput) => Promise<Ticket | undefined>
  loadQueue: (options?: { force?: boolean; successMessage?: string }) => Promise<void>
  loadRoomQueue: (roomId: string | number) => Promise<void>
  loadRoomNoShowTickets: (roomId: string | number) => Promise<void>
  redirectTicket: (input: RedirectTicketInput) => Promise<void>
  refreshAnalyticsData: () => Promise<void>
  resolveRecommendation: (id: string) => Promise<void>
  resolveRecommendations: (ids: string[]) => Promise<{ failedCount: number; hiddenIds: string[] }>
  returnTicket: (ticketId: string, roomId?: string | number) => Promise<void>
  selectTicket: (ticketId?: string) => void
  skipTicket: (ticketId: string) => Promise<void>
  startService: (ticketId: string) => Promise<void>
}

const emptyKpi: QueueKpi = {
  activeTickets: 0,
  averageWaitMinutes: 0,
  completedToday: 0,
  overloadedRooms: 0,
}

const defaultSuccessMessage = 'Данные успешно обновлены'
const defaultErrorMessage = 'Не удалось загрузить данные'
const activeTicketStatuses = new Set<Ticket['status']>(['waiting', 'called', 'in_service', 'redirected'])
const warnedReturnedNoShowIds = new Set<string>()

function getQueueErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, defaultErrorMessage)
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  return (error as { response?: { status?: number } }).response?.status
}

function isRecommendationResolveUnsupported(error: unknown): boolean {
  const status = getHttpStatus(error)

  return status === 404 || status === 405 || status === 501
}

function isActiveTicket(ticket: Ticket): boolean {
  return activeTicketStatuses.has(ticket.status)
}

function isNoShowTicket(ticket: Ticket): boolean {
  return ticket.status === 'no_show'
}

function mergeTicketsById(...ticketGroups: Ticket[][]): Ticket[] {
  const ticketMap = new Map<string, Ticket>()

  ticketGroups.flat().forEach((ticket) => {
    ticketMap.set(ticket.id, ticket)
  })

  return Array.from(ticketMap.values())
}

function replaceRoomTickets(currentTickets: Ticket[], roomTickets: Ticket[], roomId: string | number): Ticket[] {
  const roomIdValue = String(roomId)

  return mergeTicketsById(
    currentTickets.filter((ticket) => String(ticket.roomId) !== roomIdValue),
    roomTickets,
  )
}

function warnReturnedNoShow(ticketId: string): void {
  if (!import.meta.env.DEV || warnedReturnedNoShowIds.has(ticketId)) {
    return
  }

  warnedReturnedNoShowIds.add(ticketId)
  console.warn('Backend вернул талон как no_show после успешного возврата')
}

function applyReturnedOverrides(
  tickets: Ticket[],
  returnedTicketOverrides: Record<string, Ticket>,
): { returnedTicketOverrides: Record<string, Ticket>; tickets: Ticket[] } {
  const nextOverrides = { ...returnedTicketOverrides }
  const visibleTickets: Ticket[] = []

  tickets.forEach((ticket) => {
    const returnedTicket = nextOverrides[ticket.id]

    if (!returnedTicket) {
      visibleTickets.push(ticket)
      return
    }

    if (ticket.status === 'no_show') {
      warnReturnedNoShow(ticket.id)
      return
    }

    delete nextOverrides[ticket.id]
    visibleTickets.push(ticket)
  })

  return {
    returnedTicketOverrides: nextOverrides,
    tickets: mergeTicketsById(visibleTickets, Object.values(nextOverrides)),
  }
}

function getClosedTickets(tickets: Ticket[]): Ticket[] {
  return tickets.filter((ticket) => !isActiveTicket(ticket) && !isNoShowTicket(ticket))
}

function createReturnedTicket(ticketId: string, ticket: Ticket, roomId?: string | number): Ticket {
  return {
    ...ticket,
    calledAt: undefined,
    completedAt: undefined,
    roomId: roomId !== undefined ? String(roomId) : ticket.roomId,
    startedAt: undefined,
    status: 'waiting',
    updatedAt: new Date().toISOString(),
    id: ticket.id || ticketId,
  }
}

function createSnapshotUpdate(
  snapshot: Pick<QueueState, 'analytics' | 'events' | 'kpi' | 'recommendations' | 'rooms'> & { tickets: Ticket[] },
  state: QueueState,
) {
  const resolved = applyReturnedOverrides(snapshot.tickets, state.returnedTicketOverrides)
  const activeTickets = resolved.tickets.filter(isActiveTicket)
  const noShowTickets = resolved.tickets.filter(isNoShowTicket)

  return {
    ...snapshot,
    activeTickets,
    noShowTickets,
    returnedTicketOverrides: resolved.returnedTicketOverrides,
    tickets: resolved.tickets,
  }
}

function createRoomActiveUpdate(
  snapshot: Pick<QueueState, 'analytics' | 'events' | 'kpi' | 'recommendations' | 'rooms'> & { tickets: Ticket[] },
  state: QueueState,
  roomId: string | number,
) {
  const resolved = applyReturnedOverrides(snapshot.tickets, state.returnedTicketOverrides)
  const nextRoomActiveTickets = resolved.tickets.filter(isActiveTicket)
  const activeTickets = replaceRoomTickets(state.activeTickets, nextRoomActiveTickets, roomId)
  const tickets = mergeTicketsById(getClosedTickets(state.tickets), activeTickets, state.noShowTickets)

  return {
    ...snapshot,
    activeTickets,
    noShowTickets: state.noShowTickets,
    returnedTicketOverrides: resolved.returnedTicketOverrides,
    tickets,
  }
}

function createRoomSnapshotUpdate(
  snapshot: Pick<QueueState, 'analytics' | 'events' | 'kpi' | 'recommendations' | 'rooms'> & { tickets: Ticket[] },
  state: QueueState,
  roomId: string | number,
) {
  const roomIdValue = String(roomId)
  const resolved = applyReturnedOverrides(snapshot.tickets, state.returnedTicketOverrides)
  const roomTickets = resolved.tickets.filter((ticket) => String(ticket.roomId) === roomIdValue)
  const activeTickets = replaceRoomTickets(state.activeTickets, roomTickets.filter(isActiveTicket), roomId)
  const noShowTickets = replaceRoomTickets(state.noShowTickets, roomTickets.filter(isNoShowTicket), roomId)

  return {
    ...snapshot,
    activeTickets,
    noShowTickets,
    returnedTicketOverrides: resolved.returnedTicketOverrides,
    tickets: mergeTicketsById(getClosedTickets(state.tickets), activeTickets, noShowTickets),
  }
}

function createRoomNoShowUpdate(noShowSnapshotTickets: Ticket[], state: QueueState, roomId: string | number) {
  const resolved = applyReturnedOverrides(noShowSnapshotTickets, state.returnedTicketOverrides)
  const activeFromOverrides = resolved.tickets.filter(isActiveTicket)
  const roomNoShowTickets = resolved.tickets.filter(isNoShowTicket)
  const activeTickets = mergeTicketsById(state.activeTickets, activeFromOverrides)
  const noShowTickets = replaceRoomTickets(state.noShowTickets, roomNoShowTickets, roomId)

  return {
    activeTickets,
    noShowTickets,
    returnedTicketOverrides: resolved.returnedTicketOverrides,
    tickets: mergeTicketsById(getClosedTickets(state.tickets), activeTickets, noShowTickets),
  }
}

export const useQueueStore = create<QueueState>((set, get) => ({
  activeTickets: [],
  analytics: [],
  error: null,
  events: [],
  hydrated: false,
  kpi: emptyKpi,
  loading: false,
  noShowTickets: [],
  recommendations: [],
  returnedTicketOverrides: {},
  rooms: [],
  statusMessage: null,
  tickets: [],

  callNextTicket: async (roomId) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.callNextTicket(roomId)
      set((state) => ({
        ...createSnapshotUpdate(snapshot, state),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Queue call next failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
      throw error
    }
  },

  completeService: async (ticketId) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.completeService(ticketId)
      set((state) => ({
        ...createSnapshotUpdate(snapshot, state),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Queue complete service failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
      throw error
    }
  },

  createTicket: async (input) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const before = get().tickets
      const snapshot = await queueApi.createTicket(input)
      const createdTicket = snapshot.tickets.find(
        (ticket) => !before.some((item) => item.id === ticket.id),
      )

      set((state) => ({
        ...createSnapshotUpdate(snapshot, state),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        selectedTicketId: createdTicket?.id,
        statusMessage: defaultSuccessMessage,
      }))

      return createdTicket
    } catch (error) {
      console.error('Queue ticket create failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
      throw error
    }
  },

  loadQueue: async (options) => {
    if (get().loading && !options?.force) {
      return
    }

    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.getQueueSnapshot()
      set((state) => ({
        ...createSnapshotUpdate(snapshot, state),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: options?.successMessage ?? defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Queue load failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
    }
  },

  loadRoomQueue: async (roomId) => {
    set({ error: null, loading: true, statusMessage: null })
    try {
      const snapshot = await queueApi.getRoomQueueSnapshot(roomId)
      const roomIdValue = String(roomId)
      const currentRoom = get().rooms.find((room) => String(room.id) === roomIdValue)
      const snapshotHasRoom = snapshot.rooms.some((room) => String(room.id) === roomIdValue)
      set((state) => ({
        ...createRoomActiveUpdate(snapshot, state, roomId),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        rooms: snapshotHasRoom || !currentRoom ? snapshot.rooms : [currentRoom, ...snapshot.rooms],
        statusMessage: defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Ошибка загрузки очереди:', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
    }
  },

  loadRoomNoShowTickets: async (roomId) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const tickets = await queueApi.getRoomNoShowTickets(roomId)

      set((state) => ({
        ...createRoomNoShowUpdate(tickets, state, roomId),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Queue no-show load failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
    }
  },

  redirectTicket: async (input) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.redirectTicket(input)
      set((state) => ({
        ...createSnapshotUpdate(snapshot, state),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Queue redirect ticket failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
      throw error
    }
  },

  refreshAnalyticsData: async () => {
    await get().loadQueue({
      force: true,
      successMessage: 'Аналитика обновлена',
    })
  },

  resolveRecommendation: async (id) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.resolveRecommendation(id)

      set((state) => ({
        ...createSnapshotUpdate(snapshot, state),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: 'Уведомление закрыто',
      }))
    } catch (error) {
      console.error('Queue resolve recommendation failed', error)
      set((state) => ({
        error: null,
        loading: false,
        recommendations: state.recommendations.filter((recommendation) => recommendation.id !== id),
        statusMessage: 'Уведомление закрыто',
      }))
    }
  },

  resolveRecommendations: async (ids) => {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean)

    if (uniqueIds.length === 0) {
      return { failedCount: 0, hiddenIds: [] }
    }

    set({ error: null, loading: true, statusMessage: null })

    const results = await Promise.allSettled(
      uniqueIds.map((id) => queueApi.resolveRecommendation(id)),
    )
    const hiddenIds = results.flatMap((result, index) => (
      result.status === 'fulfilled' || isRecommendationResolveUnsupported(result.reason)
        ? [uniqueIds[index]]
        : []
    ))
    const failedCount = uniqueIds.length - hiddenIds.length

    try {
      if (results.some((result) => result.status === 'fulfilled')) {
        const snapshot = await queueApi.getQueueSnapshot()

        set((state) => ({
          ...createSnapshotUpdate(snapshot, state),
          error: failedCount > 0 ? 'Не удалось закрыть часть уведомлений' : null,
          hydrated: true,
          lastUpdatedAt: new Date().toISOString(),
          loading: false,
          recommendations: snapshot.recommendations.filter(
            (recommendation) => !hiddenIds.includes(recommendation.id),
          ),
          statusMessage: failedCount > 0 ? null : 'Все уведомления закрыты',
        }))
      } else {
        set((state) => ({
          error: failedCount > 0 ? 'Не удалось закрыть часть уведомлений' : null,
          loading: false,
          recommendations: state.recommendations.filter(
            (recommendation) => !hiddenIds.includes(recommendation.id),
          ),
          statusMessage: failedCount > 0 ? null : 'Уведомления скрыты до следующей загрузки',
        }))
      }
    } catch (error) {
      console.error('Queue resolve recommendations refresh failed', error)
      set((state) => ({
        error: failedCount > 0 ? 'Не удалось закрыть часть уведомлений' : null,
        loading: false,
        recommendations: state.recommendations.filter(
          (recommendation) => !hiddenIds.includes(recommendation.id),
        ),
        statusMessage: failedCount > 0 ? null : 'Все уведомления закрыты',
      }))
    }

    return { failedCount, hiddenIds }
  },

  returnTicket: async (ticketId, roomId) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const currentTicket = get().tickets.find((ticket) => ticket.id === ticketId)
        ?? get().noShowTickets.find((ticket) => ticket.id === ticketId)
      const currentRoomId = roomId ?? currentTicket?.roomId
      const snapshot = await queueApi.returnTicket(ticketId, currentRoomId)
      const returnedTicket = snapshot.tickets.find((ticket) => ticket.id === ticketId) ?? currentTicket
      const returnedTicketOverrides = returnedTicket
        ? {
            ...get().returnedTicketOverrides,
            [ticketId]: createReturnedTicket(ticketId, returnedTicket, currentRoomId),
          }
        : get().returnedTicketOverrides

      set((state) => ({
        ...(currentRoomId !== undefined
          ? createRoomSnapshotUpdate(snapshot, { ...state, returnedTicketOverrides }, currentRoomId)
          : createSnapshotUpdate(snapshot, { ...state, returnedTicketOverrides })),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        selectedTicketId: ticketId,
        statusMessage: defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Queue return ticket failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
      throw error
    }
  },

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  skipTicket: async (ticketId) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.skipTicket(ticketId)
      set((state) => ({
        ...createSnapshotUpdate(snapshot, state),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        selectedTicketId: undefined,
        statusMessage: defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Queue skip ticket failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
      throw error
    }
  },

  startService: async (ticketId) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.startService(ticketId)
      set((state) => ({
        ...createSnapshotUpdate(snapshot, state),
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      }))
    } catch (error) {
      console.error('Queue start service failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
      throw error
    }
  },
}))
