import type { ServiceType as SharedServiceType, TicketPriority } from '@shared/types'
import type { TicketStatus } from '../../../types'
import {
  toArchitectureTicket,
  toArchitectureTickets,
  toBackendArchitectureTicketCreateInput,
  toBackendPriority,
  toSharedTicket,
  type BackendTicket,
} from '../backendAdapters'
import { apiClient, publicApiClient } from '../client'
import type {
  TicketApi,
  TicketSettingsOptions,
  TicketSettingsPayload,
  TicketSettingsServiceTypeOption,
  TicketSettingsUserOption,
} from '../types'

type BackendRoomOption = {
  _id?: string | number
  active?: boolean
  id: string | number
  isActive?: boolean
  name?: string
  roomId?: string | number
  roomName?: string
  serviceTypeIds?: Array<string | number>
  serviceTypes?: Array<string | number | { id?: string | number; name?: string; serviceTypeId?: string | number; title?: string }>
  services?: Array<string | number | { id?: string | number; name?: string; serviceTypeId?: string | number; title?: string }>
  title?: string
}

type BackendServiceTypeOption = {
  code?: string
  id: string | number
  name?: string
}

type BackendUserOption = {
  assignedRoomId?: string | number
  id: string | number
  name?: string
  roomId?: string | number
  role?: TicketSettingsUserOption['role']
  fullName?: string
}

const serviceCodeByBackendName: Record<string, SharedServiceType> = {
  analysis: 'laboratory',
  billing: 'billing',
  consultation: 'consultation',
  diagnostics: 'diagnostics',
  laboratory: 'laboratory',
  other: 'registration',
  payment: 'billing',
  pharmacy: 'pharmacy',
  registration: 'registration',
  xray: 'diagnostics',
  анализы: 'laboratory',
  аптека: 'pharmacy',
  вакцинация: 'consultation',
  'забор крови': 'laboratory',
  диагностика: 'diagnostics',
  другое: 'registration',
  'консультация кардиолога': 'consultation',
  'консультация невролога': 'consultation',
  'консультация педиатра': 'consultation',
  'консультация терапевта': 'consultation',
  'консультация хирурга': 'consultation',
  консультация: 'consultation',
  кт: 'diagnostics',
  лаборатория: 'laboratory',
  'лабораторные анализы': 'laboratory',
  мрт: 'diagnostics',
  оплата: 'billing',
  'оплата услуг': 'billing',
  'получение справки': 'registration',
  'приём документов': 'registration',
  'процедурный кабинет': 'consultation',
  регистрация: 'registration',
  рентген: 'diagnostics',
  узи: 'diagnostics',
  экг: 'diagnostics',
}

type TicketCreateBody = {
  priority: number
  roomId?: number
  serviceTypeId: number | string
}

async function postTicketAction(id: string, action: string) {
  const response = await apiClient.post<BackendTicket>(`/tickets/${id}/${action}`)

  return toArchitectureTicket(response.data)
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

    console.warn('backendTicketApi: POST /tickets with roomId failed, retrying without roomId', error)
    const response = await client.post<BackendTicket>(path, withoutRoomId(payload))

    try {
      const patchResponse = await client.patch<BackendTicket>(`/tickets/${response.data.id}`, {
        roomId: payload.roomId,
      })

      return patchResponse.data ?? response.data
    } catch (patchError) {
      console.warn('backendTicketApi: PATCH /tickets/:id roomId fallback failed', patchError)

      return response.data
    }
  }
}

async function arriveCreatedTicketWithClient(
  ticket: BackendTicket,
  client = apiClient,
  optional = false,
): Promise<BackendTicket> {
  if (ticket.status !== 'created') {
    return ticket
  }

  try {
    const response = await client.post<BackendTicket>(`/tickets/${ticket.id}/arrive`)

    return response.data
  } catch (error) {
    if (optional) {
      console.warn('backendTicketApi: public POST /tickets/:id/arrive is not available', error)

      return ticket
    }

    throw error
  }
}

async function arriveCreatedTicket(ticket: BackendTicket): Promise<BackendTicket> {
  return arriveCreatedTicketWithClient(ticket)
}

async function getOrEmpty<T>(path: string): Promise<T[]> {
  try {
    const response = await apiClient.get<unknown>(path)

    if (Array.isArray(response.data)) {
      return response.data as T[]
    }

    if (response.data && typeof response.data === 'object') {
      const record = response.data as Record<string, unknown>

      if (Array.isArray(record.data)) {
        return record.data as T[]
      }

      if (Array.isArray(record.rooms)) {
        return record.rooms as T[]
      }

      if (Array.isArray(record.users)) {
        return record.users as T[]
      }

      if (Array.isArray(record.staff)) {
        return record.staff as T[]
      }

      if (Array.isArray(record.serviceTypes)) {
        return record.serviceTypes as T[]
      }
    }

    return []
  } catch (error) {
    console.warn(`backendTicketApi: ${path} is not available yet`, error)

    return []
  }
}

function toServiceCode(option: BackendServiceTypeOption): SharedServiceType {
  const rawCode = option.code ?? option.name ?? ''
  const normalized = rawCode.trim().toLowerCase()

  return serviceCodeByBackendName[normalized] ?? 'consultation'
}

function toSettingsOptions(
  rooms: BackendRoomOption[],
  serviceTypes: BackendServiceTypeOption[],
  users: BackendUserOption[],
): TicketSettingsOptions {
  return {
    rooms: rooms.map((room) => ({
      id: String(room.id ?? room.roomId ?? room._id),
      isActive: room.isActive ?? room.active ?? true,
      name: room.name ?? room.title ?? room.roomName ?? 'Кабинет без названия',
      serviceTypeIds: room.serviceTypeIds,
      serviceTypes: room.serviceTypes,
      services: room.services,
    })),
    serviceTypes: serviceTypes.map<TicketSettingsServiceTypeOption>((serviceType) => ({
      code: toServiceCode(serviceType),
      id: serviceType.id,
      name: serviceType.name ?? serviceType.code ?? `Услуга ${serviceType.id}`,
    })),
    specialists: users.map((user) => ({
      assignedRoomId: user.assignedRoomId,
      id: user.id,
      name: user.name ?? user.fullName ?? `Специалист ${user.id}`,
      role: user.role,
      roomId: user.roomId,
    })),
  }
}

function toNumberOrUndefined(value?: string | number): number | undefined {
  if (value === undefined || value === '') {
    return undefined
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : undefined
}

function toBackendSettingsPayload(payload: TicketSettingsPayload) {
  const body: {
    comment?: string
    doctorId?: number
    etaMinutes?: number
    priority?: number
    roomId?: number
    serviceTypeId?: number | string
    status?: string
  } = {}

  const serviceTypeId = toNumberOrUndefined(payload.serviceTypeId)
  const roomId = toNumberOrUndefined(payload.roomId)
  const doctorId = toNumberOrUndefined(payload.doctorId)

  if (serviceTypeId !== undefined) {
    body.serviceTypeId = serviceTypeId
  } else if (payload.serviceTypeId !== undefined && payload.serviceTypeId !== '') {
    body.serviceTypeId = payload.serviceTypeId
  }

  if (roomId !== undefined) {
    body.roomId = roomId
  }

  if (doctorId !== undefined) {
    body.doctorId = doctorId
  }

  if (payload.priority) {
    body.priority = toBackendPriority(payload.priority as TicketPriority)
  }

  if (payload.status) {
    body.status = payload.status
  }

  if (payload.comment !== undefined) {
    body.comment = payload.comment
  }

  if (payload.etaMinutes !== undefined) {
    body.etaMinutes = payload.etaMinutes
  }

  return body
}

function toBackendCreateSettingsPayload(payload: TicketSettingsPayload & { priority: TicketPriority }) {
  const roomId = toNumberOrUndefined(payload.roomId)
  const serviceTypeId = toNumberOrUndefined(payload.serviceTypeId)

  return {
    priority: toBackendPriority(payload.priority),
    ...(roomId !== undefined ? { roomId } : {}),
    serviceTypeId: serviceTypeId ?? payload.serviceTypeId ?? 1,
  }
}

export const backendTicketApi: TicketApi = {
  async getTickets() {
    const response = await apiClient.get<BackendTicket[]>('/tickets')

    return toArchitectureTickets(response.data)
  },

  async getTicketById(id: string) {
    const response = await apiClient.get<BackendTicket>(`/tickets/${id}`)

    return toArchitectureTicket(response.data)
  },

  async createTicket(input) {
    const ticket = await createBackendTicket(
      '/tickets',
      toBackendArchitectureTicketCreateInput(input),
    )
    const arrivedTicket = await arriveCreatedTicket(ticket)

    return toArchitectureTicket(arrivedTicket)
  },

  async createKioskTicket(input) {
    const ticket = await createBackendTicket(
      '/tickets/kiosk',
      toBackendArchitectureTicketCreateInput(input),
      publicApiClient,
    )
    const arrivedTicket = await arriveCreatedTicketWithClient(ticket, publicApiClient, true)

    return toArchitectureTicket(arrivedTicket)
  },

  arriveTicket(id: string) {
    return postTicketAction(id, 'arrive')
  },

  callTicket(id: string) {
    return postTicketAction(id, 'call')
  },

  startTicket(id: string) {
    return postTicketAction(id, 'start')
  },

  completeTicket(id: string) {
    return postTicketAction(id, 'complete')
  },

  cancelTicket(id: string) {
    return postTicketAction(id, 'cancel')
  },

  noShowTicket(id: string) {
    return postTicketAction(id, 'no-show')
  },

  skipTicket(id: string) {
    return backendTicketApi.noShowTicket(id)
  },

  returnTicket(id: string) {
    return backendTicketApi.arriveTicket(id)
  },

  async redirectTicket(id: string, newRoomId: string | number) {
    const response = await apiClient.post<BackendTicket>(`/tickets/${id}/redirect`, {
      newRoomId: Number(newRoomId),
    })

    return toArchitectureTicket(response.data)
  },

  updateTicketStatus(input) {
    const actionByStatus: Partial<Record<TicketStatus, () => ReturnType<TicketApi['callTicket']>>> = {
      called: () => backendTicketApi.callTicket(input.ticketId),
      cancelled: () => backendTicketApi.cancelTicket(input.ticketId),
      completed: () => backendTicketApi.completeTicket(input.ticketId),
      in_service: () => backendTicketApi.startTicket(input.ticketId),
      no_show: () => backendTicketApi.noShowTicket(input.ticketId),
      waiting: () => backendTicketApi.arriveTicket(input.ticketId),
    }
    const action = actionByStatus[input.status]

    return action ? action() : backendTicketApi.getTicketById(input.ticketId)
  },

  async createTicketWithSettings(payload) {
    const createdTicket = await createBackendTicket(
      '/tickets',
      toBackendCreateSettingsPayload(payload),
    )
    const arrivedTicket = await arriveCreatedTicket(createdTicket)
    let resolvedTicket = arrivedTicket

    try {
      const updateResponse = await apiClient.patch<BackendTicket>(
        `/tickets/${arrivedTicket.id}`,
        toBackendSettingsPayload(payload),
      )

      if (updateResponse.data) {
        resolvedTicket = updateResponse.data
      }
    } catch (error) {
      console.warn('backendTicketApi.createTicketWithSettings: PATCH /tickets/:id is not available yet', error)
    }

    try {
      const response = await apiClient.get<BackendTicket>(`/tickets/${arrivedTicket.id}`)

      resolvedTicket = response.data
    } catch (error) {
      console.warn('backendTicketApi.createTicketWithSettings: GET /tickets/:id failed', error)
    }

    return toSharedTicket(resolvedTicket)
  },

  async getTicketSettingsOptions() {
    const [rooms, serviceTypes, users] = await Promise.all([
      getOrEmpty<BackendRoomOption>('/rooms'),
      getOrEmpty<BackendServiceTypeOption>('/service-types'),
      getOrEmpty<BackendUserOption>('/users'),
    ])
    const usersWithSpecialistRole = users.filter(
      (user) => !user.role || user.role === 'specialist',
    )
    const specialists = usersWithSpecialistRole.length > 0
      ? usersWithSpecialistRole
      : await getOrEmpty<BackendUserOption>('/staff')

    return toSettingsOptions(rooms, serviceTypes, specialists)
  },

  async updateTicketSettings(id, payload) {
    await apiClient.patch(`/tickets/${id}`, toBackendSettingsPayload(payload))

    try {
      await apiClient.get<BackendTicket>(`/tickets/${id}`)
    } catch (error) {
      console.warn('backendTicketApi.updateTicketSettings: GET /tickets/:id failed', error)
    }

    if (payload.roomId) {
      try {
        await apiClient.get<BackendTicket[]>(`/queue/room/${payload.roomId}`)
      } catch (error) {
        console.warn('backendTicketApi.updateTicketSettings: GET /queue/room/:roomId failed', error)
      }
    }
  },
}
