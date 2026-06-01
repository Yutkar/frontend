import {
  toBackendPriority,
  toBackendTicketCreateInput,
  toSharedTicket,
  type BackendTicket,
} from '../backendAdapters'
import { apiClient } from '../client'
import type { KioskApi } from '../types'

async function arriveCreatedTicket(ticket: BackendTicket): Promise<BackendTicket> {
  if (ticket.status !== 'created') {
    return ticket
  }

  const response = await apiClient.post<BackendTicket>(`/tickets/${ticket.id}/arrive`)

  return response.data
}

export const backendKioskApi: KioskApi = {
  async createTicket(input) {
    const response = await apiClient.post<BackendTicket>(
      '/tickets/kiosk',
      toBackendTicketCreateInput(input),
    )
    const ticket = await arriveCreatedTicket(response.data)

    return toSharedTicket(ticket)
  },

  async createTicketForKiosk(input) {
    const response = await apiClient.post<BackendTicket>('/tickets/kiosk', {
      priority: toBackendPriority(input.priority),
      serviceTypeId: Number(input.serviceTypeId),
    })
    const ticket = await arriveCreatedTicket(response.data)

    return toSharedTicket(ticket)
  },
}
