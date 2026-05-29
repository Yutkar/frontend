import { apiClient } from './api/client'
import type {
  CreateTicketInput,
  Ticket,
  UpdateTicketStatusInput,
} from '../types'

export const ticketService = {
  async getTickets(): Promise<Ticket[]> {
    try {
      const response = await apiClient.get<Ticket[]>('/tickets')

      return response.data
    } catch (error) {
      console.error('ticketService.getTickets failed', error)
      throw error
    }
  },

  async getTicketById(id: string): Promise<Ticket | undefined> {
    try {
      const response = await apiClient.get<Ticket>(`/tickets/${id}`)

      return response.data
    } catch (error) {
      console.error('ticketService.getTicketById failed', error)
      throw error
    }
  },

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>('/tickets', input)

      return response.data
    } catch (error) {
      console.error('ticketService.createTicket failed', error)
      throw error
    }
  },

  async callTicket(id: string): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/call`)

      return response.data
    } catch (error) {
      console.error('ticketService.callTicket failed', error)
      throw error
    }
  },

  async startTicket(id: string): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/start`)

      return response.data
    } catch (error) {
      console.error('ticketService.startTicket failed', error)
      throw error
    }
  },

  async completeTicket(id: string): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/complete`)

      return response.data
    } catch (error) {
      console.error('ticketService.completeTicket failed', error)
      throw error
    }
  },

  async cancelTicket(id: string): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/cancel`)

      return response.data
    } catch (error) {
      console.error('ticketService.cancelTicket failed', error)
      throw error
    }
  },

  async noShowTicket(id: string): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/no-show`)

      return response.data
    } catch (error) {
      console.error('ticketService.noShowTicket failed', error)
      throw error
    }
  },

  async skipTicket(id: string): Promise<Ticket> {
    try {
      return await ticketService.noShowTicket(id)
    } catch (error) {
      console.error('ticketService.skipTicket failed', error)
      throw error
    }
  },

  async returnTicket(id: string): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/return`)

      return response.data
    } catch (error) {
      console.error('ticketService.returnTicket failed', error)
      throw error
    }
  },

  async redirectTicket(id: string, newRoomId: string): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>(`/tickets/${id}/redirect`, {
        newRoomId,
      })

      return response.data
    } catch (error) {
      console.error('ticketService.redirectTicket failed', error)
      throw error
    }
  },

  async updateTicketStatus(input: UpdateTicketStatusInput): Promise<Ticket | undefined> {
    try {
      if (input.status === 'called') {
        return await ticketService.callTicket(input.ticketId)
      }

      if (input.status === 'in_service') {
        return await ticketService.startTicket(input.ticketId)
      }

      if (input.status === 'completed') {
        return await ticketService.completeTicket(input.ticketId)
      }

      if (input.status === 'cancelled') {
        return await ticketService.cancelTicket(input.ticketId)
      }

      if (input.status === 'no_show') {
        return await ticketService.noShowTicket(input.ticketId)
      }

      return await ticketService.getTicketById(input.ticketId)
    } catch (error) {
      console.error('ticketService.updateTicketStatus failed', error)
      throw error
    }
  },
}
