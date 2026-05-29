import { apiClient } from './api/client'
import type { ServiceType } from '@shared/types'

export type KioskTicket = {
  number: string
  serviceType: ServiceType
}

export const kioskService = {
  async createTicket(serviceTypeId: ServiceType): Promise<KioskTicket> {
    try {
      const response = await apiClient.post<KioskTicket>('/kiosk/tickets', {
        serviceTypeId,
      })

      return response.data
    } catch (error) {
      console.error('kioskService.createTicket failed', error)
      throw error
    }
  },
}
