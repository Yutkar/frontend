import { apiClient } from './api/client'

export const queueService = {
  async getStats() {
    const response = await apiClient.get('/queue/stats')
    return response.data
  },

  async getQueueByRoom(roomId: number) {
    const response = await apiClient.get(`/queue/room/${roomId}`)
    return response.data
  },

  async getNextTicket(roomId: number) {
    const response = await apiClient.get(`/queue/room/${roomId}/next`)
    return response.data
  },

  async getHighPriority() {
    const response = await apiClient.get('/queue/high-priority')
    return response.data
  },

  async checkOverload() {
    const response = await apiClient.get('/queue/overload')
    return response.data
  },
}