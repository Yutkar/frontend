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
  error: string | null
  events: QueueEvent[]
  hydrated: boolean
  kpi: QueueKpi
  lastUpdatedAt?: string
  loading: boolean
  recommendations: QueueRecommendation[]
  rooms: Room[]
  selectedTicketId?: string
  statusMessage: string | null
  tickets: Ticket[]
  callNextTicket: (roomId: string) => Promise<void>
  completeService: (ticketId: string) => Promise<void>
  createTicket: (input: TicketCreateInput) => Promise<Ticket | undefined>
  loadQueue: (options?: { force?: boolean; successMessage?: string }) => Promise<void>
  loadRoomQueue: (roomId: string | number) => Promise<void>
  redirectTicket: (input: RedirectTicketInput) => Promise<void>
  refreshAnalyticsData: () => Promise<void>
  resolveRecommendation: (id: string) => Promise<void>
  resolveRecommendations: (ids: string[]) => Promise<{ failedCount: number; hiddenIds: string[] }>
  returnTicket: (ticketId: string) => Promise<void>
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

export const useQueueStore = create<QueueState>((set, get) => ({
  analytics: [],
  error: null,
  events: [],
  hydrated: false,
  kpi: emptyKpi,
  loading: false,
  recommendations: [],
  rooms: [],
  statusMessage: null,
  tickets: [],

  callNextTicket: async (roomId) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.callNextTicket(roomId)
      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      })
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
      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      })
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

      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        selectedTicketId: createdTicket?.id,
        statusMessage: defaultSuccessMessage,
      })

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
      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: options?.successMessage ?? defaultSuccessMessage,
      })
    } catch (error) {
      console.error('Queue load failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
    }
  },

  loadRoomQueue: async (roomId) => {
    set({ error: null, loading: true, statusMessage: null })
    try {
      const snapshot = await queueApi.getRoomQueueSnapshot(roomId)
      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      })
    } catch (error) {
      console.error('Ошибка загрузки очереди:', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
    }
  },

  redirectTicket: async (input) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.redirectTicket(input)
      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      })
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

      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: 'Уведомление закрыто',
      })
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

        set({
          ...snapshot,
          error: failedCount > 0 ? 'Не удалось закрыть часть уведомлений' : null,
          hydrated: true,
          lastUpdatedAt: new Date().toISOString(),
          loading: false,
          recommendations: snapshot.recommendations.filter(
            (recommendation) => !hiddenIds.includes(recommendation.id),
          ),
          statusMessage: failedCount > 0 ? null : 'Все уведомления закрыты',
        })
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

  returnTicket: async (ticketId) => {
    set({ error: null, loading: true, statusMessage: null })

    try {
      const snapshot = await queueApi.returnTicket(ticketId)
      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        selectedTicketId: ticketId,
        statusMessage: defaultSuccessMessage,
      })
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
      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        selectedTicketId: undefined,
        statusMessage: defaultSuccessMessage,
      })
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
      set({
        ...snapshot,
        error: null,
        hydrated: true,
        lastUpdatedAt: new Date().toISOString(),
        loading: false,
        statusMessage: defaultSuccessMessage,
      })
    } catch (error) {
      console.error('Queue start service failed', error)
      set({ error: getQueueErrorMessage(error), loading: false, statusMessage: null })
      throw error
    }
  },
}))
