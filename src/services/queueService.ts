import { queueApi, ticketApi, type QueueListener, type QueueOverloadRoom } from './api'
import type { QueueStats, Room, Ticket } from '../types'

export const queueService = {
  async getStats(): Promise<QueueStats> {
    try {
      return await queueApi.getStats()
    } catch (error) {
      console.error('queueService.getStats failed', error)
      throw error
    }
  },

  async getQueueByRoom(roomId: string | number): Promise<Ticket[]> {
    try {
      return await queueApi.getQueueByRoom(roomId)
    } catch (error) {
      console.error('queueService.getQueueByRoom failed', error)
      throw error
    }
  },

  async getNextTicket(roomId: string | number): Promise<Ticket | undefined> {
    try {
      return await queueApi.getNextTicket(roomId)
    } catch (error) {
      console.error('queueService.getNextTicket failed', error)
      throw error
    }
  },

  async getHighPriority(): Promise<Ticket[]> {
    try {
      return await queueApi.getHighPriority()
    } catch (error) {
      console.error('queueService.getHighPriority failed', error)
      throw error
    }
  },

  async checkOverload(): Promise<QueueOverloadRoom[]> {
    try {
      return await queueApi.checkOverload()
    } catch (error) {
      console.error('queueService.checkOverload failed', error)
      throw error
    }
  },

  async getQueue(): Promise<Ticket[]> {
    try {
      return await queueApi.getQueue()
    } catch (error) {
      console.error('queueService.getQueue failed', error)
      throw error
    }
  },

  async getRooms(): Promise<Room[]> {
    try {
      return await queueApi.getRooms()
    } catch (error) {
      console.error('queueService.getRooms failed', error)
      throw error
    }
  },

  async callNext(roomId?: string | number): Promise<Ticket | undefined> {
    try {
      if (!roomId) {
        const highPriorityTicket = (await queueApi.getHighPriority())[0]

        return highPriorityTicket ? ticketApi.callTicket(highPriorityTicket.id) : undefined
      }

      const nextTicket = await queueApi.getNextTicket(roomId)

      return nextTicket ? ticketApi.callTicket(nextTicket.id) : undefined
    } catch (error) {
      console.error('queueService.callNext failed', error)
      throw error
    }
  },

  async startService(ticketId: string): Promise<Ticket | undefined> {
    try {
      return await ticketApi.startTicket(ticketId)
    } catch (error) {
      console.error('queueService.startService failed', error)
      throw error
    }
  },

  async completeService(ticketId: string): Promise<Ticket | undefined> {
    try {
      return await ticketApi.completeTicket(ticketId)
    } catch (error) {
      console.error('queueService.completeService failed', error)
      throw error
    }
  },

  subscribeQueue(listener: QueueListener): () => void {
    return queueApi.subscribeQueue(listener)
  },

  replaceQueue(nextTickets: Ticket[]): void {
    queueApi.replaceQueue(nextTickets)
  },
}
