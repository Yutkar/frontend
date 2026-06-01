import { toBackendTicketCreateInput, toSharedTicket, type BackendTicket } from '../backendAdapters'
import { apiClient } from '../client'
import type { KioskApi } from '../types'

export const backendKioskApi: KioskApi = {
  async createTicket(input) {
    const response = await apiClient.post<BackendTicket>(
      '/tickets/kiosk',
      toBackendTicketCreateInput(input),
    )

    return toSharedTicket(response.data)
  },
}
