import { apiClient } from './api/client'

export const ticketService = {
  async getTickets() {
    const response = await apiClient.get('/tickets')
    return response.data
  },

  async getTicketById(id: string) {
    const response = await apiClient.get(`/tickets/${id}`)
    return response.data
  },

  async createTicket(input: { serviceTypeId: number; priority?: number }) {
    const response = await apiClient.post('/tickets', input)
    return response.data
  },

  async callTicket(id: string) {
    const response = await apiClient.post(`/tickets/${id}/call`)
    return response.data
  },

  async startTicket(id: string) {
    const response = await apiClient.post(`/tickets/${id}/start`)
    return response.data
  },

  async completeTicket(id: string) {
    const response = await apiClient.post(`/tickets/${id}/complete`)
    return response.data
  },

  async cancelTicket(id: string) {
    const response = await apiClient.post(`/tickets/${id}/cancel`)
    return response.data
  },

  async noShowTicket(id: string) {
    const response = await apiClient.post(`/tickets/${id}/no-show`)
    return response.data
  },

  async redirectTicket(id: string, newRoomId: number) {
    const response = await apiClient.post(`/tickets/${id}/redirect`, { newRoomId })
    return response.data
  },
}
