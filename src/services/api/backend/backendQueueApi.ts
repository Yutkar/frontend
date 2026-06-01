import type { QueueStats, Room, Ticket } from '../../../types'
import {
  toArchitectureRooms,
  toArchitectureTickets,
  toBackendRooms,
  toBackendTicketCreateInput,
  toQueueKpi,
  toQueueSnapshot,
  type BackendRoom,
  type BackendOverloadRoom,
  type BackendQueueStats,
  type BackendTicket,
} from '../backendAdapters'
import { apiClient, publicApiClient } from '../client'
import type { QueueApi, QueueOverloadRoom } from '../types'

async function loadQueueSnapshot(ticketPath = '/tickets?status=waiting') {
  const [ticketsResponse, statsResponse, overloadResponse, rooms] = await Promise.all([
    apiClient.get<BackendTicket[]>(ticketPath),
    apiClient.get<BackendQueueStats[]>('/queue/stats'),
    apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
    getBackendRooms(),
  ])

  return toQueueSnapshot(ticketsResponse.data, statsResponse.data, overloadResponse.data, rooms)
}

async function arriveCreatedTicket(ticket: BackendTicket): Promise<void> {
  if (ticket.status === 'created') {
    await apiClient.post<BackendTicket>(`/tickets/${ticket.id}/arrive`)
  }
}

function toQueueStats(stats: BackendQueueStats[], overload: BackendOverloadRoom[]): QueueStats {
  const kpi = toQueueKpi([], stats, overload)

  return {
    activeTickets: stats.reduce((sum, item) => sum + item.activeTickets, 0),
    averageWaitMinutes: kpi.averageWaitMinutes,
    completedToday: 0,
    overloadedRooms: overload.length,
  }
}

async function getBackendRooms(): Promise<BackendRoom[]> {
  try {
    const response = await apiClient.get<unknown>('/rooms')

    return toBackendRooms(response.data)
  } catch (error) {
    console.warn('backendQueueApi: GET /rooms is not available for queue snapshot', error)

    return []
  }
}

function toRooms(stats: BackendQueueStats[]): Room[] {
  return stats.map((item) => ({
    id: String(item.roomId),
    name: item.roomName,
    serviceTypes: [],
  }))
}

function toOverloadRooms(overload: BackendOverloadRoom[]): QueueOverloadRoom[] {
  return overload.map((room) => ({
    queueCount: room.queueCount,
    roomId: String(room.roomId),
    roomName: room.roomName,
  }))
}

export const backendQueueApi: QueueApi = {
  getQueueSnapshot() {
    return loadQueueSnapshot()
  },

  async getBoardSnapshot() {
    const response = await publicApiClient.get<BackendTicket[]>('/queue/board')

    return toQueueSnapshot(response.data)
  },

  async getRoomQueueSnapshot(roomId: string | number) {
    const [ticketsResponse, statsResponse, overloadResponse, rooms] = await Promise.all([
      apiClient.get<BackendTicket[]>(`/queue/room/${roomId}`),
      apiClient.get<BackendQueueStats[]>('/queue/stats'),
      apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
      getBackendRooms(),
    ])

    return toQueueSnapshot(ticketsResponse.data, statsResponse.data, overloadResponse.data, rooms)
  },

  async createTicket(input) {
    const response = await apiClient.post<BackendTicket>('/tickets', toBackendTicketCreateInput(input))

    await arriveCreatedTicket(response.data)

    return loadQueueSnapshot()
  },

  async createKioskTicket(input) {
    const response = await apiClient.post<BackendTicket>(
      '/tickets/kiosk',
      toBackendTicketCreateInput(input),
    )

    await arriveCreatedTicket(response.data)

    return loadQueueSnapshot()
  },

  async callNextTicket(roomId: string) {
    const response = await apiClient.get<BackendTicket | null>(`/queue/room/${roomId}/next`)

    if (response.data?.id) {
      await apiClient.post<BackendTicket>(`/tickets/${response.data.id}/call`)
    }

    return loadQueueSnapshot()
  },

  async startService(ticketId: string) {
    await apiClient.post<BackendTicket>(`/tickets/${ticketId}/start`)

    return loadQueueSnapshot()
  },

  async completeService(ticketId: string) {
    await apiClient.post<BackendTicket>(`/tickets/${ticketId}/complete`)

    return loadQueueSnapshot()
  },

  async skipTicket(ticketId: string) {
    await apiClient.post<BackendTicket>(`/tickets/${ticketId}/no-show`)

    return loadQueueSnapshot()
  },

  async returnTicket(ticketId: string) {
    await apiClient.post<BackendTicket>(`/tickets/${ticketId}/arrive`)

    return loadQueueSnapshot()
  },

  async redirectTicket(input) {
    await apiClient.post<BackendTicket>(`/tickets/${input.ticketId}/redirect`, {
      newRoomId: Number(input.roomId),
      reason: input.reason,
    })

    return loadQueueSnapshot()
  },

  async recalculateRoom(roomId: string | number) {
    await apiClient.post(`/queue/room/${roomId}/recalculate`)

    return loadQueueSnapshot()
  },

  async getStats() {
    const [statsResponse, overloadResponse] = await Promise.all([
      apiClient.get<BackendQueueStats[]>('/queue/stats'),
      apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
    ])

    return toQueueStats(statsResponse.data, overloadResponse.data)
  },

  async getQueueByRoom(roomId: string | number) {
    const response = await apiClient.get<BackendTicket[]>(`/queue/room/${roomId}`)

    return toArchitectureTickets(response.data)
  },

  async getNextTicket(roomId: string | number) {
    const response = await apiClient.get<BackendTicket | null>(`/queue/room/${roomId}/next`)

    return response.data ? toArchitectureTickets([response.data])[0] : undefined
  },

  async getHighPriority() {
    const response = await apiClient.get<BackendTicket[]>('/queue/high-priority')

    return toArchitectureTickets(response.data)
  },

  async checkOverload() {
    const response = await apiClient.get<BackendOverloadRoom[]>('/queue/overload')

    return toOverloadRooms(response.data)
  },

  async getQueue() {
    const response = await apiClient.get<BackendTicket[]>('/tickets?status=waiting')

    return toArchitectureTickets(response.data)
  },

  async getRooms() {
    const rooms = await getBackendRooms()

    if (rooms.length > 0) {
      return toArchitectureRooms(rooms)
    }

    const response = await apiClient.get<BackendQueueStats[]>('/queue/stats')

    return toRooms(response.data)
  },

  subscribeQueue(listener) {
    let active = true

    publicApiClient
      .get<BackendTicket[]>('/queue/board')
      .then((response) => {
        if (active) {
          listener(toArchitectureTickets(response.data))
        }
      })
      .catch((error) => {
        console.error('backendQueueApi.subscribeQueue failed', error)
      })

    return () => {
      active = false
    }
  },

  replaceQueue(_nextTickets: Ticket[]): void {
    throw new Error('queueApi.replaceQueue is available only in mock API mode.')
  },
}
