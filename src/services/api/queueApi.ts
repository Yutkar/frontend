import type {
  QueueKpi,
  QueueSnapshot,
  RedirectTicketInput,
  Room,
  Ticket,
  TicketCreateInput,
} from '@shared/types'
import { ticketService } from '@services/ticketService'
import { apiClient } from './client'

const emptyKpi: QueueKpi = {
  activeTickets: 0,
  averageWaitMinutes: 0,
  completedToday: 0,
  overloadedRooms: 0,
}

async function loadQueueSnapshot(): Promise<QueueSnapshot> {
  const [
    ticketsResponse,
    roomsResponse,
    statsResponse,
  ] = await Promise.all([
    apiClient.get<Ticket[]>('/tickets'),
    apiClient.get<Room[]>('/rooms'),
    apiClient.get<QueueKpi>('/queue/stats'),
  ])

  return {
    tickets: ticketsResponse.data,
    rooms: roomsResponse.data,
    events: [],
    recommendations: [],
    analytics: [],
    kpi: statsResponse.data ?? emptyKpi,
  }
}

export const queueApi = {
  async getQueueSnapshot(): Promise<QueueSnapshot> {
    try {
      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.getQueueSnapshot failed', error)
      throw error
    }
  },

  async createTicket(input: TicketCreateInput): Promise<QueueSnapshot> {
    try {
      await apiClient.post<Ticket>('/tickets', input)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.createTicket failed', error)
      throw error
    }
  },

  async callNextTicket(roomId: string): Promise<QueueSnapshot> {
    try {
      const response = await apiClient.get<Ticket | undefined>(`/queue/room/${roomId}/next`)

      if (response.data?.id) {
        await apiClient.post<Ticket>(`/tickets/${response.data.id}/call`)
      }

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.callNextTicket failed', error)
      throw error
    }
  },

  async startService(ticketId: string): Promise<QueueSnapshot> {
    try {
      await apiClient.post<Ticket>(`/tickets/${ticketId}/start`)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.startService failed', error)
      throw error
    }
  },

  async completeService(ticketId: string): Promise<QueueSnapshot> {
    try {
      await apiClient.post<Ticket>(`/tickets/${ticketId}/complete`)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.completeService failed', error)
      throw error
    }
  },

  async redirectTicket(input: RedirectTicketInput): Promise<QueueSnapshot> {
    try {
      await apiClient.post<Ticket>(`/tickets/${input.ticketId}/redirect`, {
        newRoomId: input.roomId,
        reason: input.reason,
      })

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.redirectTicket failed', error)
      throw error
    }
  },

  async skipTicket(ticketId: string): Promise<QueueSnapshot> {
    try {
      await ticketService.skipTicket(ticketId)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.skipTicket failed', error)
      throw error
    }
  },

  async returnTicket(ticketId: string): Promise<QueueSnapshot> {
    try {
      await ticketService.returnTicket(ticketId)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.returnTicket failed', error)
      throw error
    }
  },
}
