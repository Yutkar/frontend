import type { QueueApi } from '../types'
import {
  callNextSharedTicket,
  createSharedTicket,
  getArchitectureQueueByRoom,
  getArchitectureRooms,
  getArchitectureTickets,
  getHighPriorityArchitectureTickets,
  getNextSharedTicket,
  getOverloadRooms,
  getQueueSnapshot,
  getQueueStats,
  redirectSharedTicket,
  replaceArchitectureQueue,
  resolveMockRecommendation,
  toArchitectureTicket,
  updateSharedTicketStatus,
} from './mockState'

export const mockQueueApi: QueueApi = {
  getQueueSnapshot() {
    return Promise.resolve(getQueueSnapshot())
  },

  getBoardSnapshot() {
    return Promise.resolve(getQueueSnapshot())
  },

  getRoomQueueSnapshot(roomId: string | number) {
    const snapshot = getQueueSnapshot()
    const roomIdValue = String(roomId)

    return Promise.resolve({
      ...snapshot,
      rooms: snapshot.rooms.filter((room) => room.id === roomIdValue),
      tickets: snapshot.tickets.filter((ticket) => ticket.roomId === roomIdValue),
    })
  },

  createTicket(input) {
    createSharedTicket(input)

    return Promise.resolve(getQueueSnapshot())
  },

  createKioskTicket(input) {
    createSharedTicket(input)

    return Promise.resolve(getQueueSnapshot())
  },

  callNextTicket(roomId: string) {
    callNextSharedTicket(roomId)

    return Promise.resolve(getQueueSnapshot())
  },

  startService(ticketId: string) {
    updateSharedTicketStatus(ticketId, 'in_service')

    return Promise.resolve(getQueueSnapshot())
  },

  completeService(ticketId: string) {
    updateSharedTicketStatus(ticketId, 'completed')

    return Promise.resolve(getQueueSnapshot())
  },

  skipTicket(ticketId: string) {
    updateSharedTicketStatus(ticketId, 'no_show')

    return Promise.resolve(getQueueSnapshot())
  },

  returnTicket(ticketId: string) {
    updateSharedTicketStatus(ticketId, 'waiting')

    return Promise.resolve(getQueueSnapshot())
  },

  redirectTicket(input) {
    redirectSharedTicket(input.ticketId, input.roomId)

    return Promise.resolve(getQueueSnapshot())
  },

  recalculateRoom() {
    return Promise.resolve(getQueueSnapshot())
  },

  resolveRecommendation(id: string) {
    return Promise.resolve(resolveMockRecommendation(id))
  },

  getStats() {
    return Promise.resolve(getQueueStats())
  },

  getQueueByRoom(roomId: string | number) {
    return Promise.resolve(getArchitectureQueueByRoom(roomId))
  },

  getNextTicket(roomId: string | number) {
    const ticket = getNextSharedTicket(roomId)

    return Promise.resolve(ticket ? toArchitectureTicket(ticket) : undefined)
  },

  getHighPriority() {
    return Promise.resolve(getHighPriorityArchitectureTickets())
  },

  checkOverload() {
    return Promise.resolve(getOverloadRooms())
  },

  getQueue() {
    return Promise.resolve(getArchitectureTickets())
  },

  getRooms() {
    return Promise.resolve(getArchitectureRooms())
  },

  subscribeQueue(listener) {
    let active = true

    Promise.resolve(getArchitectureTickets()).then((tickets) => {
      if (active) {
        listener(tickets)
      }
    })

    return () => {
      active = false
    }
  },

  replaceQueue(nextTickets) {
    replaceArchitectureQueue(nextTickets)
  },
}
