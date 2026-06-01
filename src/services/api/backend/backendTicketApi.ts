import type { ServiceType as SharedServiceType, TicketPriority } from '@shared/types'
import type { TicketStatus } from '../../../types'
import {
  toArchitectureTicket,
  toArchitectureTickets,
  toBackendArchitectureTicketCreateInput,
  toBackendPriority,
  type BackendTicket,
} from '../backendAdapters'
import { apiClient } from '../client'
import type {
  TicketApi,
  TicketSettingsOptions,
  TicketSettingsPayload,
  TicketSettingsServiceTypeOption,
  TicketSettingsUserOption,
} from '../types'

type BackendRoomOption = {
  id: string | number
  name?: string
  roomName?: string
}

type BackendServiceTypeOption = {
  code?: string
  id: string | number
  name?: string
}

type BackendUserOption = {
  id: string | number
  name?: string
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
}

async function postTicketAction(id: string, action: string) {
  const response = await apiClient.post<BackendTicket>(`/tickets/${id}/${action}`)

  return toArchitectureTicket(response.data)
}

async function arriveCreatedTicket(ticket: BackendTicket): Promise<BackendTicket> {
  if (ticket.status !== 'created') {
    return ticket
  }

  const response = await apiClient.post<BackendTicket>(`/tickets/${ticket.id}/arrive`)

  return response.data
}

async function getOrEmpty<T>(path: string): Promise<T[]> {
  try {
    const response = await apiClient.get<T[]>(path)

    return response.data
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
      id: String(room.id),
      name: room.name ?? room.roomName ?? `Кабинет ${room.id}`,
    })),
    serviceTypes: serviceTypes.map<TicketSettingsServiceTypeOption>((serviceType) => ({
      code: toServiceCode(serviceType),
      id: serviceType.id,
      name: serviceType.name ?? serviceType.code ?? `Услуга ${serviceType.id}`,
    })),
    specialists: users.map((user) => ({
      id: user.id,
      name: user.name ?? user.fullName ?? `Специалист ${user.id}`,
      role: user.role,
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
    serviceTypeId?: number
    status?: string
  } = {}

  const serviceTypeId = toNumberOrUndefined(payload.serviceTypeId)
  const roomId = toNumberOrUndefined(payload.roomId)
  const doctorId = toNumberOrUndefined(payload.doctorId)

  if (serviceTypeId !== undefined) {
    body.serviceTypeId = serviceTypeId
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
    const response = await apiClient.post<BackendTicket>(
      '/tickets',
      toBackendArchitectureTicketCreateInput(input),
    )
    const ticket = await arriveCreatedTicket(response.data)

    return toArchitectureTicket(ticket)
  },

  async createKioskTicket(input) {
    const response = await apiClient.post<BackendTicket>(
      '/tickets/kiosk',
      toBackendArchitectureTicketCreateInput(input),
    )
    const ticket = await arriveCreatedTicket(response.data)

    return toArchitectureTicket(ticket)
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
  },
}
