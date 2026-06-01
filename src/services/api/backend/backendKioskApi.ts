import { toBackendTicketCreateInput, toSharedTicket, type BackendTicket } from '../backendAdapters'
import { apiClient } from '../client'
import type { KioskApi } from '../types'

export const backendKioskApi: KioskApi = {
  async createTicket(input) {
    const response = await apiClient.post<BackendTicket>(
      '/tickets/kiosk',
      toBackendTicketCreateInput(input),
    )
    const ticket = response.data.status === 'created'
      ? (await apiClient.post<BackendTicket>(`/tickets/${response.data.id}/arrive`)).data
      : response.data

    return toSharedTicket(ticket)
  },
}
