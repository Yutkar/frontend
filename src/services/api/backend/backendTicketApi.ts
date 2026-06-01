import type { TicketStatus } from '../../../types'
import {
  toArchitectureTicket,
  toArchitectureTickets,
  toBackendArchitectureTicketCreateInput,
  type BackendTicket,
} from '../backendAdapters'
import { apiClient } from '../client'
import type { TicketApi } from '../types'

async function postTicketAction(id: string, action: string) {
  const response = await apiClient.post<BackendTicket>(`/tickets/${id}/${action}`)

  return toArchitectureTicket(response.data)
}

export const backendTicketApi: TicketApi = {
  async getTickets() {
    const response = await apiClient.get<BackendTicket[]>('/tickets')

    return toArchitectureTickets(response.data)
  },

  async getTicketById(id: string) {
    const response = await apiClient.get<BackendTicket>(`/tickets/${id}`)

    return toArchitectureTicket(response.data)
  },

  async createTicket(input) {
    const response = await apiClient.post<BackendTicket>(
      '/tickets',
      toBackendArchitectureTicketCreateInput(input),
    )

    return toArchitectureTicket(response.data)
  },

  async createKioskTicket(input) {
    const response = await apiClient.post<BackendTicket>(
      '/tickets/kiosk',
      toBackendArchitectureTicketCreateInput(input),
    )

    return toArchitectureTicket(response.data)
  },

  arriveTicket(id: string) {
    return postTicketAction(id, 'arrive')
  },

  callTicket(id: string) {
    return postTicketAction(id, 'call')
  },

  startTicket(id: string) {
    return postTicketAction(id, 'start')
  },

  completeTicket(id: string) {
    return postTicketAction(id, 'complete')
  },

  cancelTicket(id: string) {
    return postTicketAction(id, 'cancel')
  },

  noShowTicket(id: string) {
    return postTicketAction(id, 'no-show')
  },

  skipTicket(id: string) {
    return backendTicketApi.noShowTicket(id)
  },

  returnTicket(id: string) {
    return backendTicketApi.arriveTicket(id)
  },

  async redirectTicket(id: string, newRoomId: string | number) {
    const response = await apiClient.post<BackendTicket>(`/tickets/${id}/redirect`, {
      newRoomId: Number(newRoomId),
    })

    return toArchitectureTicket(response.data)
  },

  updateTicketStatus(input) {
    const actionByStatus: Partial<Record<TicketStatus, () => ReturnType<TicketApi['callTicket']>>> = {
      called: () => backendTicketApi.callTicket(input.ticketId),
      cancelled: () => backendTicketApi.cancelTicket(input.ticketId),
      completed: () => backendTicketApi.completeTicket(input.ticketId),
      in_service: () => backendTicketApi.startTicket(input.ticketId),
      no_show: () => backendTicketApi.noShowTicket(input.ticketId),
      waiting: () => backendTicketApi.arriveTicket(input.ticketId),
    }
    const action = actionByStatus[input.status]

    return action ? action() : backendTicketApi.getTicketById(input.ticketId)
  },
}
