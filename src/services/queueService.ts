import { apiClient } from './api/client'
import { ticketService } from './ticketService'
import type { QueueStats, Room, Ticket } from '../types'

type QueueListener = (tickets: Ticket[]) => void
type QueueOverloadStatus = {
  overloaded: boolean
  overloadedRooms?: Room[]
  message?: string
}

export const queueService = {
  async getStats(): Promise<QueueStats> {
    try {
      const response = await apiClient.get<QueueStats>('/queue/stats')

      return response.data
    } catch (error) {
      console.error('queueService.getStats failed', error)
      throw error
    }
  },

  async getQueueByRoom(roomId: string): Promise<Ticket[]> {
    try {
      const response = await apiClient.get<Ticket[]>(`/queue/room/${roomId}`)

      return response.data
    } catch (error) {
      console.error('queueService.getQueueByRoom failed', error)
      throw error
    }
  },

  async getNextTicket(roomId: string): Promise<Ticket | undefined> {
    try {
      const response = await apiClient.get<Ticket>(`/queue/room/${roomId}/next`)

      return response.data
    } catch (error) {
      console.error('queueService.getNextTicket failed', error)
      throw error
    }
  },

  async getHighPriority(): Promise<Ticket[]> {
    try {
      const response = await apiClient.get<Ticket[]>('/queue/high-priority')

      return response.data
    } catch (error) {
      console.error('queueService.getHighPriority failed', error)
      throw error
    }
  },

  async checkOverload(): Promise<QueueOverloadStatus> {
    try {
      const response = await apiClient.get<QueueOverloadStatus>('/queue/overload')

      return response.data
    } catch (error) {
      console.error('queueService.checkOverload failed', error)
      throw error
    }
  },

  async getQueue(): Promise<Ticket[]> {
    try {
      return await ticketService.getTickets()
    } catch (error) {
      console.error('queueService.getQueue failed', error)
      throw error
    }
  },

  async getRooms(): Promise<Room[]> {
    try {
      const response = await apiClient.get<Room[]>('/rooms')

      return response.data
    } catch (error) {
      console.error('queueService.getRooms failed', error)
      throw error
    }
  },

  async callNext(roomId?: string): Promise<Ticket | undefined> {
    try {
      const nextTicket = roomId
        ? await queueService.getNextTicket(roomId)
        : (await queueService.getHighPriority())[0]

      if (!nextTicket) {
        return undefined
      }

      return await ticketService.callTicket(nextTicket.id)
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

    queueService.getQueue()
      .then((tickets) => {
        if (active) {
          listener(tickets)
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
