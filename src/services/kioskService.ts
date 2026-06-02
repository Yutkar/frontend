import { kioskApi, toServiceError } from './api'
import type { TicketCreateSettingsPayload } from './api'
import { withOperationalRefresh } from './syncService'
import type { Ticket, TicketCreateInput } from '@shared/types'

export const kioskService = {
  async createTicket(input: TicketCreateInput): Promise<Ticket> {
    try {
      return await withOperationalRefresh(
        () => kioskApi.createTicket(input),
        'Талон успешно создан',
      )
    } catch (error) {
      console.error('kioskService.createTicket failed', error)
      throw toServiceError(error, 'Не удалось создать талон')
    }
  },

  async createTicketForKiosk(input: TicketCreateSettingsPayload): Promise<Ticket> {
    try {
      return await withOperationalRefresh(
        () => kioskApi.createTicketForKiosk(input),
        'Талон успешно создан',
      )
    } catch (error) {
      console.error('kioskService.createTicketForKiosk failed', error)
      throw toServiceError(error, 'Не удалось создать талон')
    }
  },
}
