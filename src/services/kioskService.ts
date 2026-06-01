import { kioskApi } from './api'
import type { TicketCreateSettingsPayload } from './api'
import type { Ticket, TicketCreateInput } from '@shared/types'

export const kioskService = {
  createTicket(input: TicketCreateInput): Promise<Ticket> {
    return kioskApi.createTicket(input)
  },

  createTicketForKiosk(input: TicketCreateSettingsPayload): Promise<Ticket> {
    return kioskApi.createTicketForKiosk(input)
  },
}
