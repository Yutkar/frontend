import type { QueueSnapshot, RedirectTicketInput } from '@shared/types'
import type { QueueStats, Room, Ticket } from '../../../types'
import {
  toArchitectureRooms,
  toArchitectureTickets,
  toBackendRooms,
  toBackendTickets,
  getBackendTicketRoomId,
  toBoardQueueSnapshot,
  toBackendAnalyticsPoints,
  toSharedAnalytics,
  toSharedTicket,
  toSharedStatus,
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

const activeRoomStatuses = ['waiting', 'called', 'in_service', 'redirected'] as const
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

type BackendRedirectBody = {
  newRoomId: string | number
  serviceTypeId?: string | number
  note?: string
  comment?: string
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
    apiClient.get<unknown>(ticketPath),
    apiClient.get<BackendQueueStats[]>('/queue/stats'),
    apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
    getBackendRooms(),
    getBackendRecommendations(),
    getBackendHighPriorityTickets(),
    getBackendAnalyticsPoints(),
  ])
  const backendTickets = toBackendTickets(ticketsResponse.data)
  const referencedTickets = await getRecommendationTickets(recommendations, [
    ...backendTickets,
    ...highPriorityTickets,
  ])
  const tickets = mergeBackendTickets(backendTickets, referencedTickets)

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

function isBackendRoomAcceptingTickets(room: BackendRoom): boolean {
  const record = room as Record<string, unknown>
  const issueEnabled = record.ticketIssueEnabled
    ?? record.isTicketIssueEnabled
    ?? record.kioskEnabled

  if (issueEnabled === false) {
    return false
  }

  if (typeof record.isActive === 'boolean') {
    return record.isActive
  }

  if (typeof record.active === 'boolean') {
    return record.active
  }

  return record.status !== 'paused' && record.status !== 'inactive' && record.status !== 'deleted'
}

async function assertRoomAcceptsTickets(roomId?: string | number) {
  if (roomId === undefined) {
    return
  }

  const rooms = await getBackendRooms()

  if (rooms.length === 0) {
    return
  }

  const room = rooms.find((item) => String(item.id ?? item.roomId ?? item._id) === String(roomId))

  if (!room || !isBackendRoomAcceptingTickets(room)) {
    throw new Error('Ticket issuance is closed for this room.')
  }
}

async function getBackendHighPriorityTickets(): Promise<BackendTicket[]> {
  try {
    const response = await apiClient.get<unknown>('/queue/high-priority')

    return toBackendTickets(response.data)
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
    missingTicketIds.map((ticketId) => apiClient.get<unknown>(`/tickets/${ticketId}`)),
  )

  return results.flatMap((result) => (
    result.status === 'fulfilled' ? toBackendTickets(result.value.data) : []
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
    const response = await apiClient.get<unknown>('/tickets')

    return toBackendTickets(response.data)
  } catch (error) {
    console.warn('backendQueueApi: GET /tickets fallback for room queue failed', error)

    return []
  }
}

function isActiveRoomTicket(ticket: BackendTicket): boolean {
  return activeRoomStatuses.includes(ticket.status as (typeof activeRoomStatuses)[number])
}

function isNoShowTicket(ticket: BackendTicket): boolean {
  const status = ticket.status?.trim().toLowerCase().replace(/-/g, '_')

  return status === 'no_show' || status === 'noshow'
}

async function getBackendNoShowTicketsForRoom(roomId: string | number): Promise<BackendTicket[]> {
  const roomIdValue = String(roomId)

  try {
    const response = await apiClient.get<unknown>(
      `/tickets?roomId=${encodeURIComponent(roomIdValue)}&status=no_show`,
    )

    return toBackendTickets(response.data)
      .filter((ticket) => getBackendTicketRoomId(ticket) === roomIdValue)
      .filter(isNoShowTicket)
  } catch (error) {
    console.warn('backendQueueApi: GET /tickets?roomId=:roomId&status=no_show failed, using /tickets fallback', error)
  }

  const allTickets = await getAllBackendTicketsForRoomFallback()

  return allTickets
    .filter((ticket) => getBackendTicketRoomId(ticket) === roomIdValue)
    .filter(isNoShowTicket)
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
    .filter(isActiveRoomTicket)
    .forEach((ticket) => {
      mergedTickets.set(String(ticket.id), ticket)
    })

  roomTickets
    .map((ticket) => withImplicitRoomId(ticket, roomId))
    .filter(isActiveRoomTicket)
    .forEach((ticket) => {
      mergedTickets.set(String(ticket.id), ticket)
    })

  return Array.from(mergedTickets.values())
}

async function loadRoomQueueSnapshot(
  roomId: string | number,
  extraRoomTickets: BackendTicket[] = [],
) {
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
    apiClient.get<unknown>(`/queue/room/${roomId}`),
    getAllBackendTicketsForRoomFallback(),
    apiClient.get<BackendQueueStats[]>('/queue/stats'),
    apiClient.get<BackendOverloadRoom[]>('/queue/overload'),
    getBackendRooms(),
    getBackendRecommendations(),
    getBackendHighPriorityTickets(),
    getBackendAnalyticsPoints(),
  ])
  const roomEndpointTickets = toBackendTickets(ticketsResponse.data)
  const referencedTickets = await getRecommendationTickets(recommendations, [
    ...roomEndpointTickets,
    ...allTickets,
    ...highPriorityTickets,
  ])
  const roomTickets = mergeBackendTickets(
    mergeRoomTickets(
      roomId,
      roomEndpointTickets,
      mergeBackendTickets(allTickets, referencedTickets),
    ),
    extraRoomTickets,
  )

  return ensureRoomSnapshotRoom(
    toQueueSnapshot(
      roomTickets,
      statsResponse.data,
      overloadResponse.data,
      rooms,
      recommendations,
      highPriorityTickets,
      analytics,
    ),
    roomId,
  )
}

function ensureRoomSnapshotRoom(snapshot: QueueSnapshot, roomId: string | number): QueueSnapshot {
  const roomIdValue = String(roomId)

  if (snapshot.rooms.some((room) => String(room.id) === roomIdValue)) {
    return snapshot
  }

  const roomTicket = snapshot.tickets.find((ticket) => String(ticket.roomId) === roomIdValue)

  if (!roomTicket) {
    return snapshot
  }

  const roomName = roomTicket.roomName ?? `Кабинет ${roomIdValue}`

  return {
    ...snapshot,
    rooms: [
      {
        department: roomName,
        id: roomIdValue,
        isActive: false,
        loadPercent: 0,
        name: roomName,
        specialistName: roomName,
        status: 'paused',
        workload: 0,
      },
      ...snapshot.rooms,
    ],
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

function toBackendRoomId(roomId: string | number): string | number {
  const numericRoomId = Number(roomId)

  return Number.isFinite(numericRoomId) ? numericRoomId : roomId
}

function toRedirectBody(input: RedirectTicketInput, includeOptional = true): BackendRedirectBody {
  const note = input.note?.trim()
  const comment = input.comment?.trim() ?? input.reason?.trim()

  return {
    newRoomId: toBackendRoomId(input.roomId),
    ...(includeOptional && input.serviceTypeId !== undefined ? { serviceTypeId: input.serviceTypeId } : {}),
    ...(includeOptional && note ? { note } : {}),
    ...(includeOptional && comment ? { comment } : {}),
  }
}

export const backendQueueApi: QueueApi = {
  getQueueSnapshot() {
    return loadQueueSnapshot()
  },

  async getBoardSnapshot(roomId?: string | number) {
    const response = roomId
      ? await publicApiClient
        .get<unknown>(`/queue/board/${encodeURIComponent(String(roomId))}`)
        .catch((error) => {
          console.warn('backendQueueApi: public room board is not available, loading common board', error)

          return publicApiClient.get<unknown>('/queue/board')
        })
      : await publicApiClient.get<unknown>('/queue/board')
    const snapshot = toBoardQueueSnapshot(response.data)

    if (!roomId) {
      return snapshot
    }

    const roomIdValue = String(roomId)

    return {
      ...snapshot,
      rooms: snapshot.rooms.filter((room) => String(room.id) === roomIdValue),
      tickets: snapshot.tickets.filter((ticket) => String(ticket.roomId) === roomIdValue),
    }
  },

  async getPeriodAnalytics(period) {
    const response = await apiClient.get<unknown>(`/queue/analytics/period?period=${period}`)

    return toSharedAnalytics(toBackendAnalyticsPoints(response.data))
  },

  async getRoomQueueSnapshot(roomId: string | number) {
    return loadRoomQueueSnapshot(roomId)
  },

  async getRoomNoShowTickets(roomId: string | number) {
    const tickets = await getBackendNoShowTicketsForRoom(roomId)

    return tickets.map((ticket) => ({
      ...toSharedTicket(ticket),
      roomId: getBackendTicketRoomId(ticket) || String(roomId),
      status: 'no_show',
    }))
  },

  async createTicket(input) {
    await assertRoomAcceptsTickets(input.roomId)

    const ticket = await createBackendTicket('/tickets', toBackendTicketCreateInput(input))

    await arriveCreatedTicket(ticket)

    return loadQueueSnapshot()
  },

  async createKioskTicket(input) {
    await assertRoomAcceptsTickets(input.roomId)

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
    const responseRoomId = response.data ? getBackendTicketRoomId(response.data) : undefined

    if (response.data?.id && (!responseRoomId || responseRoomId === String(roomId))) {
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

  async returnTicket(ticketId: string, roomId?: string | number) {
    const returnedTicket = await requestTicketReturn(ticketId, { roomId })
    let resolvedTicket = returnedTicket

    try {
      const ticketResponse = await apiClient.get<BackendTicket>(`/tickets/${ticketId}`)
      if (toSharedStatus(ticketResponse.data.status) !== 'no_show') {
        resolvedTicket = ticketResponse.data
      }
    } catch (error) {
      console.warn('backendQueueApi.returnTicket: GET /tickets/:id failed after return', error)
    }

    const resolvedRoomId = getBackendTicketRoomId(resolvedTicket)
      || getBackendTicketRoomId(returnedTicket)
      || (roomId !== undefined ? String(roomId) : undefined)

    if (resolvedRoomId) {
      const noShowTickets = (await getBackendNoShowTicketsForRoom(resolvedRoomId))
        .filter((ticket) => String(ticket.id) !== String(ticketId))

      return loadRoomQueueSnapshot(resolvedRoomId, [resolvedTicket, ...noShowTickets])
    }

    return loadQueueSnapshot()
  },

  async redirectTicket(input) {
    try {
      await apiClient.post<BackendTicket>(`/tickets/${input.ticketId}/redirect`, toRedirectBody(input))
    } catch (error) {
      console.warn('backendQueueApi.redirectTicket: extended payload failed, retrying with newRoomId only', error)
      await apiClient.post<BackendTicket>(`/tickets/${input.ticketId}/redirect`, toRedirectBody(input, false))
    }

    const snapshot = await loadQueueSnapshot()
    const redirectedRoomId = String(input.roomId)

    return {
      ...snapshot,
      tickets: snapshot.tickets.map((ticket) => (
        ticket.id === input.ticketId
          ? { ...ticket, roomId: redirectedRoomId }
          : ticket
      )),
    }
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
    const responseRoomId = response.data ? getBackendTicketRoomId(response.data) : undefined

    return response.data && (!responseRoomId || responseRoomId === String(roomId))
      ? toArchitectureTickets([response.data])[0]
      : undefined
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
