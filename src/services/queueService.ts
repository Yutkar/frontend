import { apiClient } from './api/client'
import {
  toArchitectureTickets,
  toQueueKpi,
  type BackendOverloadRoom,
  type BackendQueueStats,
  type BackendTicket,
} from './api/backendAdapters'
import { ticketService } from './ticketService'
import type { QueueStats, Room, Ticket } from '../types'

type QueueListener = (tickets: Ticket[]) => void

function toQueueStats(stats: BackendQueueStats[], overload: BackendOverloadRoom[]): QueueStats {
  const kpi = toQueueKpi([], stats, overload)

  return {
    activeTickets: stats.reduce((sum, item) => sum + item.activeTickets, 0),
    averageWaitMinutes: kpi.averageWaitMinutes,
    completedToday: 0,
    overloadedRooms: overload.length,
  }
}

function toRooms(stats: BackendQueueStats[]): Room[] {
  return stats.map((item) => ({
    id: String(item.roomId),
    name: item.roomName,
    serviceTypes: [],
  }))
}

export const queueService = {
  async getStats(): Promise<QueueStats> {
    try {
      const [statsResponse, overloadResponse] = await Promise.all([
        apiClient.get<BackendQueueStats[]>('/queue/stats'),
        apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
      ])

      return toQueueStats(statsResponse.data, overloadResponse.data)
    } catch (error) {
      console.error('queueService.getStats failed', error)
      throw error
    }
  },

  async getQueueByRoom(roomId: string | number): Promise<Ticket[]> {
    try {
      const response = await apiClient.get<BackendTicket[]>(`/queue/room/${roomId}`)

      return toArchitectureTickets(response.data)
    } catch (error) {
      console.error('queueService.getQueueByRoom failed', error)
      throw error
    }
  },

  async getNextTicket(roomId: string | number): Promise<Ticket | undefined> {
    try {
      const response = await apiClient.get<BackendTicket | null>(`/queue/room/${roomId}/next`)

      return response.data ? toArchitectureTickets([response.data])[0] : undefined
    } catch (error) {
      console.error('queueService.getNextTicket failed', error)
      throw error
    }
  },

  async getHighPriority(): Promise<Ticket[]> {
    try {
      const response = await apiClient.get<BackendTicket[]>('/queue/high-priority')

      return toArchitectureTickets(response.data)
    } catch (error) {
      console.error('queueService.getHighPriority failed', error)
      throw error
    }
  },

  async checkOverload(): Promise<BackendOverloadRoom[]> {
    try {
      const response = await apiClient.get<BackendOverloadRoom[]>('/queue/overload')

      return response.data
    } catch (error) {
      console.error('queueService.checkOverload failed', error)
      throw error
    }
  },

  async getQueue(): Promise<Ticket[]> {
    try {
      const response = await apiClient.get<BackendTicket[]>('/tickets')

      return toArchitectureTickets(response.data)
    } catch (error) {
      console.error('queueService.getQueue failed', error)
      throw error
    }
  },

  async getRooms(): Promise<Room[]> {
    try {
      const response = await apiClient.get<BackendQueueStats[]>('/queue/stats')

      return toRooms(response.data)
    } catch (error) {
      console.error('queueService.getRooms failed', error)
      throw error
    }
  },

  async callNext(roomId?: string | number): Promise<Ticket | undefined> {
    try {
      if (!roomId) {
        const highPriorityTicket = (await queueService.getHighPriority())[0]

        return highPriorityTicket ? ticketService.callTicket(highPriorityTicket.id) : undefined
      }

      const nextTicket = await queueService.getNextTicket(roomId)

      return nextTicket ? ticketService.callTicket(nextTicket.id) : undefined
    } catch (error) {
      console.error('queueService.callNext failed', error)
      throw error
    }
  },

  async startService(ticketId: string): Promise<Ticket | undefined> {
    try {
      return await ticketService.startTicket(ticketId)
    } catch (error) {
      console.error('queueService.startService failed', error)
      throw error
    }
  },

  async completeService(ticketId: string): Promise<Ticket | undefined> {
    try {
      return await ticketService.completeTicket(ticketId)
    } catch (error) {
      console.error('queueService.completeService failed', error)
      throw error
    }
  },

  subscribeQueue(listener: QueueListener): () => void {
    let active = true

    apiClient.get<BackendTicket[]>('/queue/board')
      .then((response) => {
        if (active) {
          listener(toArchitectureTickets(response.data))
        }
      })
      .catch((error) => {
        console.error('queueService.subscribeQueue failed', error)
      })

    return () => {
      active = false
    }
  },

  replaceQueue(_nextTickets: Ticket[]): void {
    const error = new Error('queueService.replaceQueue is not available with the backend API')

    console.error('queueService.replaceQueue failed', error)
    throw error
  },
}
