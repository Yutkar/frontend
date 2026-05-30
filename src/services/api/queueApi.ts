import type {
  QueueSnapshot,
  RedirectTicketInput,
  TicketCreateInput,
} from '@shared/types'
import {
  toBackendTicketCreateInput,
  toQueueSnapshot,
  type BackendOverloadRoom,
  type BackendQueueStats,
  type BackendTicket,
} from './backendAdapters'
import { apiClient } from './client'

async function loadQueueSnapshot(): Promise<QueueSnapshot> {
  const [
    ticketsResponse,
    statsResponse,
    overloadResponse,
  ] = await Promise.all([
    apiClient.get<BackendTicket[]>('/tickets'),
    apiClient.get<BackendQueueStats[]>('/queue/stats'),
    apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
  ])

  return toQueueSnapshot(ticketsResponse.data, statsResponse.data, overloadResponse.data)
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

  async getBoardSnapshot(): Promise<QueueSnapshot> {
    try {
      const response = await apiClient.get<BackendTicket[]>('/queue/board')

      return toQueueSnapshot(response.data)
    } catch (error) {
      console.error('queueApi.getBoardSnapshot failed', error)
      throw error
    }
  },

  async createTicket(input: TicketCreateInput): Promise<QueueSnapshot> {
    try {
      await apiClient.post<BackendTicket>('/tickets', toBackendTicketCreateInput(input))

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.createTicket failed', error)
      throw error
    }
  },

  async createKioskTicket(input: TicketCreateInput): Promise<QueueSnapshot> {
    try {
      await apiClient.post<BackendTicket>('/tickets/kiosk', toBackendTicketCreateInput(input))

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.createKioskTicket failed', error)
      throw error
    }
  },

  async callNextTicket(roomId: string): Promise<QueueSnapshot> {
    try {
      const response = await apiClient.get<BackendTicket | null>(`/queue/room/${roomId}/next`)

      if (response.data?.id) {
        await apiClient.post<BackendTicket>(`/tickets/${response.data.id}/call`)
      }

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.callNextTicket failed', error)
      throw error
    }
  },

  async startService(ticketId: string): Promise<QueueSnapshot> {
    try {
      await apiClient.post<BackendTicket>(`/tickets/${ticketId}/start`)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.startService failed', error)
      throw error
    }
  },

  async completeService(ticketId: string): Promise<QueueSnapshot> {
    try {
      await apiClient.post<BackendTicket>(`/tickets/${ticketId}/complete`)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.completeService failed', error)
      throw error
    }
  },

  async skipTicket(ticketId: string): Promise<QueueSnapshot> {
    try {
      await apiClient.post<BackendTicket>(`/tickets/${ticketId}/no-show`)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.skipTicket failed', error)
      throw error
    }
  },

  async returnTicket(ticketId: string): Promise<QueueSnapshot> {
    try {
      await apiClient.post<BackendTicket>(`/tickets/${ticketId}/arrive`)

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.returnTicket failed', error)
      throw error
    }
  },

  async redirectTicket(input: RedirectTicketInput): Promise<QueueSnapshot> {
    try {
      await apiClient.post<BackendTicket>(`/tickets/${input.ticketId}/redirect`, {
        newRoomId: Number(input.roomId),
      })

      return await loadQueueSnapshot()
    } catch (error) {
      console.error('queueApi.redirectTicket failed', error)
      throw error
    }
  },
}
