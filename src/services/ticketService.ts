import {
  ticketApi,
  type TicketSettingsOptions,
  type TicketSettingsPayload,
} from './api'
import type {
  CreateTicketInput,
  Ticket,
  UpdateTicketStatusInput,
} from '../types'

export const ticketService = {
  async getTickets(): Promise<Ticket[]> {
    try {
      return await ticketApi.getTickets()
    } catch (error) {
      console.error('ticketService.getTickets failed', error)
      throw error
    }
  },

  async getTicketById(id: string): Promise<Ticket | undefined> {
    try {
      return await ticketApi.getTicketById(id)
    } catch (error) {
      console.error('ticketService.getTicketById failed', error)
      throw error
    }
  },

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    try {
      return await ticketApi.createTicket(input)
    } catch (error) {
      console.error('ticketService.createTicket failed', error)
      throw error
    }
  },

  async arriveTicket(id: string): Promise<Ticket> {
    try {
      return await ticketApi.arriveTicket(id)
    } catch (error) {
      console.error('ticketService.arriveTicket failed', error)
      throw error
    }
  },

  async callTicket(id: string): Promise<Ticket> {
    try {
      return await ticketApi.callTicket(id)
    } catch (error) {
      console.error('ticketService.callTicket failed', error)
      throw error
    }
  },

  async startTicket(id: string): Promise<Ticket> {
    try {
      return await ticketApi.startTicket(id)
    } catch (error) {
      console.error('ticketService.startTicket failed', error)
      throw error
    }
  },

  async completeTicket(id: string): Promise<Ticket> {
    try {
      return await ticketApi.completeTicket(id)
    } catch (error) {
      console.error('ticketService.completeTicket failed', error)
      throw error
    }
  },

  async cancelTicket(id: string): Promise<Ticket> {
    try {
      return await ticketApi.cancelTicket(id)
    } catch (error) {
      console.error('ticketService.cancelTicket failed', error)
      throw error
    }
  },

  async noShowTicket(id: string): Promise<Ticket> {
    try {
      return await ticketApi.noShowTicket(id)
    } catch (error) {
      console.error('ticketService.noShowTicket failed', error)
      throw error
    }
  },

  async skipTicket(id: string): Promise<Ticket> {
    try {
      return await ticketApi.skipTicket(id)
    } catch (error) {
      console.error('ticketService.skipTicket failed', error)
      throw error
    }
  },

  async returnTicket(id: string): Promise<Ticket> {
    try {
      return await ticketApi.returnTicket(id)
    } catch (error) {
      console.error('ticketService.returnTicket failed', error)
      throw error
    }
  },

  async redirectTicket(id: string, newRoomId: string | number): Promise<Ticket> {
    try {
      return await ticketApi.redirectTicket(id, newRoomId)
    } catch (error) {
      console.error('ticketService.redirectTicket failed', error)
      throw error
    }
  },

  async updateTicketStatus(input: UpdateTicketStatusInput): Promise<Ticket | undefined> {
    try {
      return await ticketApi.updateTicketStatus(input)
    } catch (error) {
      console.error('ticketService.updateTicketStatus failed', error)
      throw error
    }
  },

  async getTicketSettingsOptions(): Promise<TicketSettingsOptions> {
    try {
      return await ticketApi.getTicketSettingsOptions()
    } catch (error) {
      console.error('ticketService.getTicketSettingsOptions failed', error)
      throw error
    }
  },

  async updateTicketSettings(id: string, payload: TicketSettingsPayload): Promise<void> {
    try {
      await ticketApi.updateTicketSettings(id, payload)
    } catch (error) {
      console.error('ticketService.updateTicketSettings failed', error)
      throw error
    }
  },
}
