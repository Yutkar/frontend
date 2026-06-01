import type { TicketStatus } from '../../../types'
import type { TicketApi } from '../types'
import {
  createArchitectureTicket,
  getArchitectureTicketById,
  getArchitectureTickets,
  redirectSharedTicket,
  toArchitectureTicket,
  updateSharedTicketStatus,
} from './mockState'

function updateTicketStatus(id: string, status: TicketStatus) {
  return toArchitectureTicket(updateSharedTicketStatus(id, status))
}

export const mockTicketApi: TicketApi = {
  getTickets() {
    return Promise.resolve(getArchitectureTickets())
  },

  getTicketById(id: string) {
    return Promise.resolve(getArchitectureTicketById(id))
  },

  createTicket(input) {
    return Promise.resolve(createArchitectureTicket(input))
  },

  createKioskTicket(input) {
    return Promise.resolve(createArchitectureTicket(input))
  },

  arriveTicket(id: string) {
    return Promise.resolve(updateTicketStatus(id, 'waiting'))
  },

  callTicket(id: string) {
    return Promise.resolve(updateTicketStatus(id, 'called'))
  },

  startTicket(id: string) {
    return Promise.resolve(updateTicketStatus(id, 'in_service'))
  },

  completeTicket(id: string) {
    return Promise.resolve(updateTicketStatus(id, 'completed'))
  },

  cancelTicket(id: string) {
    return Promise.resolve(updateTicketStatus(id, 'cancelled'))
  },

  noShowTicket(id: string) {
    return Promise.resolve(updateTicketStatus(id, 'no_show'))
  },

  skipTicket(id: string) {
    return Promise.resolve(updateTicketStatus(id, 'no_show'))
  },

  returnTicket(id: string) {
    return Promise.resolve(updateTicketStatus(id, 'waiting'))
  },

  redirectTicket(id: string, newRoomId: string | number) {
    return Promise.resolve(toArchitectureTicket(redirectSharedTicket(id, newRoomId)))
  },

  updateTicketStatus(input) {
    return Promise.resolve(updateTicketStatus(input.ticketId, input.status))
  },
}
