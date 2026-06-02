import { create } from 'zustand'
import { queueApi } from '@services/api'
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
  events: QueueEvent[]
  hydrated: boolean
  kpi: QueueKpi
  loading: boolean
  recommendations: QueueRecommendation[]
  rooms: Room[]
  selectedTicketId?: string
  tickets: Ticket[]
  callNextTicket: (roomId: string) => Promise<void>
  completeService: (ticketId: string) => Promise<void>
  createTicket: (input: TicketCreateInput) => Promise<Ticket | undefined>
  loadQueue: () => Promise<void>
  loadRoomQueue: (roomId: string | number) => Promise<void>
  redirectTicket: (input: RedirectTicketInput) => Promise<void>
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

export const useQueueStore = create<QueueState>((set, get) => ({
  analytics: [],
  events: [],
  hydrated: false,
  kpi: emptyKpi,
  loading: false,
  recommendations: [],
  rooms: [],
  tickets: [],

  callNextTicket: async (roomId) => {
    set({ loading: true })
    const snapshot = await queueApi.callNextTicket(roomId)
    set({ ...snapshot, hydrated: true, loading: false })
  },

  completeService: async (ticketId) => {
    set({ loading: true })
    const snapshot = await queueApi.completeService(ticketId)
    set({ ...snapshot, hydrated: true, loading: false })
  },

  createTicket: async (input) => {
    set({ loading: true })
    const before = get().tickets
    const snapshot = await queueApi.createTicket(input)
    const createdTicket = snapshot.tickets.find(
      (ticket) => !before.some((item) => item.id === ticket.id),
    )

    set({
      ...snapshot,
      hydrated: true,
      loading: false,
      selectedTicketId: createdTicket?.id,
    })

    return createdTicket
  },

  loadQueue: async () => {
    if (get().loading) {
      return
    }

    set({ loading: true })
    const snapshot = await queueApi.getQueueSnapshot()
    set({ ...snapshot, hydrated: true, loading: false })
  },

  loadRoomQueue: async (roomId) => {
    set({ loading: true })
    try {
      const snapshot = await queueApi.getRoomQueueSnapshot(roomId)
      console.log('Снэпшот от API:', snapshot) // <--- ВОТ ЭТОТ ЛОГ СКАЖЕТ ВСЁ
      set({ ...snapshot, hydrated: true, loading: false })
    } catch (error) {
      console.error('Ошибка загрузки очереди:', error)
      set({ loading: false })
    }
  },

  redirectTicket: async (input) => {
    set({ loading: true })
    const snapshot = await queueApi.redirectTicket(input)
    set({ ...snapshot, hydrated: true, loading: false })
  },

  returnTicket: async (ticketId) => {
    set({ loading: true })
    const snapshot = await queueApi.returnTicket(ticketId)
    set({ ...snapshot, hydrated: true, loading: false, selectedTicketId: ticketId })
  },

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  skipTicket: async (ticketId) => {
    set({ loading: true })
    const snapshot = await queueApi.skipTicket(ticketId)
    set({ ...snapshot, hydrated: true, loading: false, selectedTicketId: undefined })
  },

  startService: async (ticketId) => {
    set({ loading: true })
    const snapshot = await queueApi.startService(ticketId)
    set({ ...snapshot, hydrated: true, loading: false })
  },
}))
