import { cloneData, rooms, setTickets, tickets } from './data'
import { ticketService } from './ticketService'
import type { Room, Ticket } from '../types'

type QueueListener = (tickets: Ticket[]) => void

export const queueService = {
  async getQueue(): Promise<Ticket[]> {
    return cloneData(tickets)
  },

  async getRooms(): Promise<Room[]> {
    return cloneData(rooms)
  },

  async callNext(): Promise<Ticket | undefined> {
    const nextTicket = tickets.find((ticket) => ticket.status === 'waiting')

    if (!nextTicket) {
      return undefined
    }

    return ticketService.updateTicketStatus({
      ticketId: nextTicket.id,
      status: 'called',
    })
  },

  async startService(ticketId: string): Promise<Ticket | undefined> {
    return ticketService.updateTicketStatus({ ticketId, status: 'in_service' })
  },

  async completeService(ticketId: string): Promise<Ticket | undefined> {
    return ticketService.updateTicketStatus({ ticketId, status: 'completed' })
  },

  subscribeQueue(listener: QueueListener): () => void {
    listener(cloneData(tickets))

    return () => {}
  },

  replaceQueue(nextTickets: Ticket[]): void {
    setTickets(nextTickets)
  },
}
