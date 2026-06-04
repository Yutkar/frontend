import type { QueueStats, Room, Ticket } from '../../../types'
import {
  toArchitectureRooms,
  toArchitectureTickets,
  toBackendRooms,
  getBackendTicketRoomId,
  toBoardQueueSnapshot,
  toBackendAnalyticsPoints,
  toBackendTicketCreateInput,
  toBackendRecommendations,
  toQueueKpi,
  toQueueSnapshot,
  type BackendRecommendation,
  type BackendAnalyticsPoint,
  type BackendRoom,
  type BackendOverloadRoom,
  type BackendQueueStats,
  type BackendTicket,
} from '../backendAdapters'
import { apiClient, publicApiClient } from '../client'
import type { QueueApi, QueueOverloadRoom } from '../types'
import { requestTicketReturn } from './ticketReturnFallback'

const roomVisibleStatuses = ['waiting', 'called', 'in_service', 'redirected'] as const
const analyticsPaths = [
  '/analytics/dashboard',
  '/analytics/rooms',
  '/queue/analytics/service-time',
  '/queue/analytics/period?period=day',
  '/queue/analytics/period?period=week',
  '/queue/analytics/period?period=month',
  '/queue/analytics/period?period=year',
] as const

type TicketCreateBody = {
  priority: number
  roomId?: number
  serviceTypeId: number | string
}

async function loadQueueSnapshot(ticketPath = '/tickets') {
  const [
    ticketsResponse,
    statsResponse,
    overloadResponse,
    rooms,
    recommendations,
    highPriorityTickets,
    analytics,
  ] = await Promise.all([
    apiClient.get<BackendTicket[]>(ticketPath),
    apiClient.get<BackendQueueStats[]>('/queue/stats'),
    apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
    getBackendRooms(),
    getBackendRecommendations(),
    getBackendHighPriorityTickets(),
    getBackendAnalyticsPoints(),
  ])
  const referencedTickets = await getRecommendationTickets(recommendations, [
    ...ticketsResponse.data,
    ...highPriorityTickets,
  ])
  const tickets = mergeBackendTickets(ticketsResponse.data, referencedTickets)

  return toQueueSnapshot(
    tickets,
    statsResponse.data,
    overloadResponse.data,
    rooms,
    recommendations,
    highPriorityTickets,
    analytics,
  )
}

async function arriveCreatedTicket(
  ticket: BackendTicket,
  client = apiClient,
  optional = false,
): Promise<void> {
  if (ticket.status === 'created') {
    try {
      await client.post<BackendTicket>(`/tickets/${ticket.id}/arrive`)
    } catch (error) {
      if (optional) {
        console.warn('backendQueueApi: public POST /tickets/:id/arrive is not available', error)

        return
      }

      throw error
    }
  }
}

function withoutRoomId(payload: TicketCreateBody) {
  return {
    priority: payload.priority,
    serviceTypeId: payload.serviceTypeId,
  }
}

async function createBackendTicket(
  path: string,
  payload: TicketCreateBody,
  client = apiClient,
): Promise<BackendTicket> {
  try {
    const response = await client.post<BackendTicket>(path, payload)

    return response.data
  } catch (error) {
    if (payload.roomId === undefined) {
      throw error
    }

    console.warn('backendQueueApi: POST /tickets with roomId failed, retrying without roomId', error)
    const response = await client.post<BackendTicket>(path, withoutRoomId(payload))

    try {
      const patchResponse = await client.patch<BackendTicket>(`/tickets/${response.data.id}`, {
        roomId: payload.roomId,
      })

      return patchResponse.data ?? response.data
    } catch (patchError) {
      console.warn('backendQueueApi: PATCH /tickets/:id roomId fallback failed', patchError)

      return response.data
    }
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

async function getBackendRecommendations(): Promise<BackendRecommendation[]> {
  try {
    const response = await apiClient.get<unknown>('/recommendations')

    return toBackendRecommendations(response.data)
  } catch (error) {
    console.warn('backendQueueApi: GET /recommendations is not available', error)

    return []
  }
}

async function getBackendHighPriorityTickets(): Promise<BackendTicket[]> {
  try {
    const response = await apiClient.get<BackendTicket[]>('/queue/high-priority')

    return response.data
  } catch (error) {
    console.warn('backendQueueApi: GET /queue/high-priority is not available', error)

    return []
  }
}

async function getBackendAnalyticsPoints(): Promise<BackendAnalyticsPoint[]> {
  const results = await Promise.allSettled(
    analyticsPaths.map((path) => apiClient.get<unknown>(path)),
  )

  return results.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      return toBackendAnalyticsPoints(result.value.data)
    }

    console.warn(`backendQueueApi: GET ${analyticsPaths[index]} is not available`, result.reason)

    return []
  })
}

function getRecommendationTicketIds(recommendations: BackendRecommendation[]): string[] {
  return Array.from(new Set(
    recommendations
      .map((recommendation) => recommendation.ticketId ?? recommendation.ticket_id)
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .map(String),
  ))
}

async function getRecommendationTickets(
  recommendations: BackendRecommendation[],
  knownTickets: BackendTicket[],
): Promise<BackendTicket[]> {
  const knownTicketIds = new Set(knownTickets.map((ticket) => String(ticket.id)))
  const missingTicketIds = getRecommendationTicketIds(recommendations)
    .filter((ticketId) => !knownTicketIds.has(ticketId))

  if (missingTicketIds.length === 0) {
    return []
  }

  const results = await Promise.allSettled(
    missingTicketIds.map((ticketId) => apiClient.get<BackendTicket>(`/tickets/${ticketId}`)),
  )

  return results.flatMap((result) => (
    result.status === 'fulfilled' ? [result.value.data] : []
  ))
}

function mergeBackendTickets(tickets: BackendTicket[], extraTickets: BackendTicket[]): BackendTicket[] {
  const ticketMap = new Map<string, BackendTicket>()

  tickets.forEach((ticket) => ticketMap.set(String(ticket.id), ticket))
  extraTickets.forEach((ticket) => ticketMap.set(String(ticket.id), ticket))

  return Array.from(ticketMap.values())
}

async function getAllBackendTicketsForRoomFallback(): Promise<BackendTicket[]> {
  try {
    const response = await apiClient.get<BackendTicket[]>('/tickets')

    return response.data
  } catch (error) {
    console.warn('backendQueueApi: GET /tickets fallback for room queue failed', error)

    return []
  }
}

function withImplicitRoomId(ticket: BackendTicket, roomId: string | number): BackendTicket {
  if (getBackendTicketRoomId(ticket)) {
    return ticket
  }

  return {
    ...ticket,
    roomId,
  }
}

function mergeRoomTickets(roomId: string | number, roomTickets: BackendTicket[], allTickets: BackendTicket[]) {
  const roomIdValue = String(roomId)
  const mergedTickets = new Map<string, BackendTicket>()

  allTickets
    .filter((ticket) => getBackendTicketRoomId(ticket) === roomIdValue)
    .filter((ticket) => roomVisibleStatuses.includes(ticket.status as (typeof roomVisibleStatuses)[number]))
    .forEach((ticket) => {
      mergedTickets.set(String(ticket.id), ticket)
    })

  roomTickets
    .map((ticket) => withImplicitRoomId(ticket, roomId))
    .forEach((ticket) => {
      mergedTickets.set(String(ticket.id), ticket)
    })

  return Array.from(mergedTickets.values())
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
    const response = await publicApiClient.get<unknown>('/queue/board')

    return toBoardQueueSnapshot(response.data)
  },

  async getRoomQueueSnapshot(roomId: string | number) {
    const [
      ticketsResponse,
      allTickets,
      statsResponse,
      overloadResponse,
      rooms,
      recommendations,
      highPriorityTickets,
      analytics,
    ] = await Promise.all([
      apiClient.get<BackendTicket[]>(`/queue/room/${roomId}`),
      getAllBackendTicketsForRoomFallback(),
      apiClient.get<BackendQueueStats[]>('/queue/stats'),
      apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
      getBackendRooms(),
      getBackendRecommendations(),
      getBackendHighPriorityTickets(),
      getBackendAnalyticsPoints(),
    ])
    const referencedTickets = await getRecommendationTickets(recommendations, [
      ...ticketsResponse.data,
      ...allTickets,
      ...highPriorityTickets,
    ])
    const roomTickets = mergeRoomTickets(roomId, ticketsResponse.data, mergeBackendTickets(allTickets, referencedTickets))

    return toQueueSnapshot(
      roomTickets,
      statsResponse.data,
      overloadResponse.data,
      rooms,
      recommendations,
      highPriorityTickets,
      analytics,
    )
  },

  async createTicket(input) {
    const ticket = await createBackendTicket('/tickets', toBackendTicketCreateInput(input))

    await arriveCreatedTicket(ticket)

    return loadQueueSnapshot()
  },

  async createKioskTicket(input) {
    const ticket = await createBackendTicket(
      '/tickets/kiosk',
      toBackendTicketCreateInput(input),
      publicApiClient,
    )

    await arriveCreatedTicket(ticket, publicApiClient, true)

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
    await requestTicketReturn(ticketId)

    return loadQueueSnapshot()
  },

  async redirectTicket(input) {
    await apiClient.post<BackendTicket>(`/tickets/${input.ticketId}/redirect`, {
      newRoomId: Number(input.roomId),
    })

    return loadQueueSnapshot()
  },

  async recalculateRoom(roomId: string | number) {
    await apiClient.post(`/queue/room/${roomId}/recalculate`)

    return loadQueueSnapshot()
  },

  async resolveRecommendation(id: string) {
    await apiClient.patch(`/recommendations/${id}/resolve`)

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
