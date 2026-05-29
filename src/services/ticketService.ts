import { cloneData, rooms, serviceTypes, setTickets, tickets } from './data'
import type {
  CreateTicketInput,
  Ticket,
  UpdateTicketStatusInput,
} from '../types'

export const ticketService = {
  async getTickets(): Promise<Ticket[]> {
    return cloneData(tickets)
  },

  async getTicketById(id: string): Promise<Ticket | undefined> {
    return cloneData(tickets.find((ticket) => ticket.id === id))
  },

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const serviceType = serviceTypes.find((item) => item.id === input.serviceTypeId) ?? serviceTypes[0]
    const room = rooms.find((item) =>
      item.serviceTypes.some((itemServiceType) => itemServiceType.id === serviceType.id),
    ) ?? rooms[0]
    const ticket: Ticket = {
      id: `ticket-${Date.now()}`,
      number: `A${String(tickets.length + 1).padStart(3, '0')}`,
      serviceType,
      status: 'waiting',
      room,
      priority: input.priority,
      eta: Math.max(5, tickets.filter((item) => item.status === 'waiting').length * 5),
    }

    setTickets([ticket, ...tickets])

    return cloneData(ticket)
  },

  async updateTicketStatus(input: UpdateTicketStatusInput): Promise<Ticket | undefined> {
    let updatedTicket: Ticket | undefined

    setTickets(
      tickets.map((ticket) => {
        if (ticket.id !== input.ticketId) {
          return ticket
        }

        updatedTicket = {
          ...ticket,
          status: input.status,
          eta: input.status === 'waiting' ? ticket.eta : 0,
        }

        return updatedTicket
      }),
    )

    return cloneData(updatedTicket)
  },
}
