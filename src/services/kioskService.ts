import { kioskApi } from './api'
import type { Ticket, TicketCreateInput } from '@shared/types'

export const kioskService = {
  createTicket(input: TicketCreateInput): Promise<Ticket> {
    return kioskApi.createTicket(input)
  },
}
