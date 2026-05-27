import { calculateQueueKpi, createInitialQueueSnapshot } from '@mock/queue.mock'
import type {
  QueueEvent,
  QueueSnapshot,
  RedirectTicketInput,
  Room,
  Ticket,
  TicketCreateInput,
  TicketPriority,
} from '@shared/types'
import { createMockTicket, createQueueEvent, getServiceTypeLabel } from '@shared/utils'
import { resolveMockApi } from './client'

const priorityWeight: Record<TicketPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

let queueState = createInitialQueueSnapshot()

function getSnapshot(): QueueSnapshot {
  return {
    ...queueState,
    kpi: calculateQueueKpi(queueState.tickets, queueState.rooms),
  }
}

function prependEvent(event: QueueEvent): void {
  queueState = {
    ...queueState,
    events: [event, ...queueState.events].slice(0, 20),
  }
}

function syncRoomLoad(rooms: Room[], tickets: Ticket[]): Room[] {
  return rooms.map((room) => {
    const assignedActive = tickets.filter(
      (ticket) =>
        ticket.roomId === room.id &&
        ['called', 'in_service', 'redirected'].includes(ticket.status),
    ).length
    const waitingPressure = tickets.filter(
      (ticket) => ticket.status === 'waiting' && getServiceTypeLabel(ticket.serviceType) === room.department,
    ).length

    return {
      ...room,
      loadPercent: Math.min(99, Math.max(20, room.loadPercent + assignedActive * 3 + waitingPressure)),
      workload: Math.min(99, Math.max(20, room.loadPercent + assignedActive * 3 + waitingPressure)),
    }
  })
}

function selectNextWaitingTicket(tickets: Ticket[]): Ticket | undefined {
  return [...tickets]
    .filter((ticket) => ticket.status === 'waiting')
    .sort((left, right) => {
      const priorityDelta = priorityWeight[right.priority] - priorityWeight[left.priority]

      if (priorityDelta !== 0) {
        return priorityDelta
      }

      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    })[0]
}

export const queueApi = {
  async getQueueSnapshot(): Promise<QueueSnapshot> {
    return resolveMockApi(getSnapshot())
  },

  async createTicket(input: TicketCreateInput): Promise<QueueSnapshot> {
    const waitingCount = queueState.tickets.filter((ticket) => ticket.status === 'waiting').length
    const ticket = createMockTicket(input, waitingCount + 1)

    queueState = {
      ...queueState,
      tickets: [ticket, ...queueState.tickets],
    }

    prependEvent(
      createQueueEvent('ticket_created', `${ticket.number} создан для ${ticket.patientName}`, {
        ticketId: ticket.id,
        ticketNumber: ticket.number,
      }),
    )

    return resolveMockApi(getSnapshot())
  },

  async callNextTicket(roomId: string): Promise<QueueSnapshot> {
    const room = queueState.rooms.find((item) => item.id === roomId) ?? queueState.rooms[0]
    const nextTicket = selectNextWaitingTicket(queueState.tickets)

    if (!room || !nextTicket) {
      return resolveMockApi(getSnapshot())
    }

    const calledAt = new Date().toISOString()

    queueState = {
      ...queueState,
      rooms: queueState.rooms.map((item) =>
        item.id === room.id
          ? { ...item, currentTicketId: nextTicket.id, status: 'busy' }
          : item,
      ),
      tickets: queueState.tickets.map((ticket) =>
        ticket.id === nextTicket.id
          ? {
              ...ticket,
              calledAt,
              etaMinutes: 0,
              roomId: room.id,
              status: 'called',
            }
          : ticket,
      ),
    }

    prependEvent(
      createQueueEvent('ticket_called', `${nextTicket.number} вызван в ${room.name}`, {
        roomId: room.id,
        ticketId: nextTicket.id,
        ticketNumber: nextTicket.number,
      }),
    )

    return resolveMockApi(getSnapshot())
  },

  async startService(ticketId: string): Promise<QueueSnapshot> {
    const ticket = queueState.tickets.find((item) => item.id === ticketId)

    if (!ticket) {
      return resolveMockApi(getSnapshot())
    }

    queueState = {
      ...queueState,
      tickets: queueState.tickets.map((item) =>
        item.id === ticketId
          ? {
              ...item,
              startedAt: new Date().toISOString(),
              status: 'in_service',
            }
          : item,
      ),
    }

    prependEvent(
      createQueueEvent('service_started', `${ticket.number} начал обслуживание`, {
        roomId: ticket.roomId,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
      }),
    )

    return resolveMockApi(getSnapshot())
  },

  async completeService(ticketId: string): Promise<QueueSnapshot> {
    const ticket = queueState.tickets.find((item) => item.id === ticketId)

    if (!ticket) {
      return resolveMockApi(getSnapshot())
    }

    queueState = {
      ...queueState,
      rooms: queueState.rooms.map((room) =>
        room.currentTicketId === ticketId
          ? { ...room, currentTicketId: undefined, status: 'open' }
          : room,
      ),
      tickets: queueState.tickets.map((item) =>
        item.id === ticketId
          ? {
              ...item,
              completedAt: new Date().toISOString(),
              status: 'completed',
            }
          : item,
      ),
    }

    prependEvent(
      createQueueEvent('service_completed', `${ticket.number} завершил обслуживание`, {
        roomId: ticket.roomId,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
      }),
    )

    return resolveMockApi(getSnapshot())
  },

  async redirectTicket(input: RedirectTicketInput): Promise<QueueSnapshot> {
    const ticket = queueState.tickets.find((item) => item.id === input.ticketId)
    const room = queueState.rooms.find((item) => item.id === input.roomId)

    if (!ticket || !room) {
      return resolveMockApi(getSnapshot())
    }

    queueState = {
      ...queueState,
      rooms: syncRoomLoad(
        queueState.rooms.map((item) =>
          item.id === room.id
            ? { ...item, currentTicketId: ticket.id, status: 'busy' }
            : item.currentTicketId === ticket.id
              ? { ...item, currentTicketId: undefined, status: 'open' }
              : item,
        ),
        queueState.tickets,
      ),
      tickets: queueState.tickets.map((item) =>
        item.id === ticket.id
          ? {
              ...item,
              calledAt: new Date().toISOString(),
              notes: input.reason,
              roomId: room.id,
              status: 'redirected',
            }
          : item,
      ),
    }

    prependEvent(
      createQueueEvent('ticket_called', `${ticket.number} перенаправлен в ${room.name}`, {
        roomId: room.id,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
      }),
    )

    return resolveMockApi(getSnapshot())
  },
}
