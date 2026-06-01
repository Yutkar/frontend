import type { Role, ServiceType, User } from '@shared/types'
import { apiClient } from '../client'
import type {
  AdminApi,
  AdminRecord,
  AdminRecordInput,
  AdminUserInput,
  TicketSettingsServiceTypeOption,
} from '../types'

type BackendUser = Partial<User> & {
  assignedRoomId?: string | number | null
  email?: string
  fullName?: string
  id: string | number
  room?: {
    id?: string | number | null
  } | null
  roomId?: string | number | null
}

type BackendUserResponse = BackendUser & {
  user?: BackendUser
}

type BackendServiceTypeOption = {
  code?: string
  id: string | number
  name?: string
}

const serviceCodeByBackendName: Record<string, ServiceType> = {
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
  диагностика: 'diagnostics',
  другое: 'registration',
  консультация: 'consultation',
  лаборатория: 'laboratory',
  оплата: 'billing',
  регистрация: 'registration',
  рентген: 'diagnostics',
}

function getAvatarInitials(name: string): string {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || 'SQ'
}

function getRoomId(user: BackendUser): string | undefined {
  const roomId = user.roomId ?? user.assignedRoomId ?? user.room?.id

  return roomId == null ? undefined : String(roomId)
}

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'manager' || value === 'specialist'
}

function toAdminRecord(record: AdminRecord): AdminRecord {
  return {
    ...record,
    id: record.id,
  }
}

function toServiceCode(option: BackendServiceTypeOption): ServiceType {
  const rawCode = option.code ?? option.name ?? ''
  const normalized = rawCode.trim().toLowerCase()

  return serviceCodeByBackendName[normalized] ?? 'consultation'
}

function toServiceTypeOption(option: BackendServiceTypeOption): TicketSettingsServiceTypeOption {
  return {
    code: toServiceCode(option),
    id: option.id,
    name: option.name ?? option.code ?? `Услуга ${option.id}`,
  }
}

function toUser(user: BackendUser, fallbackRole: Role = 'specialist'): User {
  const name = user.name ?? user.fullName ?? user.email ?? String(user.id)
  const role = isRole(user.role) ? user.role : fallbackRole
  const roomId = getRoomId(user)

  return {
    assignedRoomId: roomId,
    avatarInitials: user.avatarInitials ?? getAvatarInitials(name),
    department: user.department ?? (role === 'manager' ? 'Управление очередью' : 'Кабинет'),
    email: user.email,
    id: String(user.id),
    name,
    role,
    roomId,
  }
}

function unwrapUser(response: BackendUserResponse): BackendUser {
  return response.user ?? response
}

function normalizeIdValue(value: string | number): string | number {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) && String(value).trim() !== '' ? numberValue : value
}

async function requestFirst<T>(requests: Array<() => Promise<T>>): Promise<T> {
  let lastError: unknown

  for (const request of requests) {
    try {
      return await request()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

async function getAdminRecords(path: string) {
  const response = await apiClient.get<AdminRecord[]>(path)

  return response.data.map(toAdminRecord)
}

async function createAdminRecord(path: string, input: AdminRecordInput) {
  const response = await apiClient.post<AdminRecord>(path, input)

  return toAdminRecord(response.data)
}

async function updateAdminRecord(path: string, id: string | number, input: AdminRecordInput) {
  const response = await apiClient.patch<AdminRecord>(`${path}/${id}`, input)

  return toAdminRecord(response.data)
}

async function deleteAdminRecord(path: string, id: string | number) {
  await apiClient.delete(`${path}/${id}`)
}

async function fetchUsers(): Promise<User[]> {
  const users = await requestFirst([
    () => apiClient.get<BackendUser[]>('/users').then((response) => response.data),
    () => apiClient.get<BackendUser[]>('/staff').then((response) => response.data),
    () => apiClient.get<BackendUser[]>('/admin/users').then((response) => response.data),
  ])

  return users.map((user) => toUser(user))
}

export const backendAdminApi: AdminApi = {
  async getServiceTypes() {
    const response = await apiClient.get<BackendServiceTypeOption[]>('/service-types')

    return response.data.map(toServiceTypeOption)
  },

  getRooms() {
    return requestFirst([
      () => getAdminRecords('/rooms'),
      () => getAdminRecords('/admin/rooms'),
    ])
  },

  createRoom(input) {
    return requestFirst([
      () => createAdminRecord('/rooms', input),
      () => createAdminRecord('/admin/rooms', input),
    ])
  },

  updateRoom(id, input) {
    return requestFirst([
      () => updateAdminRecord('/rooms', id, input),
      () => updateAdminRecord('/admin/rooms', id, input),
    ])
  },

  deleteRoom(id) {
    return requestFirst([
      () => deleteAdminRecord('/rooms', id),
      () => deleteAdminRecord('/admin/rooms', id),
    ])
  },

  async getStaff() {
    return requestFirst([
      () => getAdminRecords('/staff'),
      async () => (await fetchUsers())
        .filter((user) => user.role === 'specialist')
        .map((user) => ({ ...user })),
      () => getAdminRecords('/admin/staff'),
    ])
  },

  createStaff(input) {
    return requestFirst([
      () => createAdminRecord('/staff', input),
      () => createAdminRecord('/admin/staff', input),
    ])
  },

  updateStaff(id, input) {
    return requestFirst([
      () => updateAdminRecord('/staff', id, input),
      () => updateAdminRecord('/admin/staff', id, input),
    ])
  },

  deleteStaff(id) {
    return requestFirst([
      () => deleteAdminRecord('/staff', id),
      () => deleteAdminRecord('/admin/staff', id),
    ])
  },

  getUsers() {
    return fetchUsers()
  },

  async createUser(input: AdminUserInput) {
    const response = await requestFirst([
      () => apiClient.post<BackendUserResponse>('/auth/register', input).then((result) => result.data),
      () => apiClient.post<BackendUserResponse>('/users', input).then((result) => result.data),
      () => apiClient.post<BackendUserResponse>('/admin/users', input).then((result) => result.data),
    ])

    return toUser(unwrapUser(response), input.role ?? 'specialist')
  },

  async updateUser(id, input) {
    const response = await requestFirst([
      () => apiClient.patch<BackendUserResponse>(`/users/${id}`, input).then((result) => result.data),
      () => apiClient.patch<BackendUserResponse>(`/staff/${id}`, input).then((result) => result.data),
      () => apiClient.put<BackendUserResponse>(`/users/${id}`, input).then((result) => result.data),
      () => apiClient.put<BackendUserResponse>(`/admin/users/${id}`, input).then((result) => result.data),
    ])

    return toUser(unwrapUser(response), input.role)
  },

  deleteUser(id) {
    return requestFirst([
      () => deleteAdminRecord('/users', id),
      () => deleteAdminRecord('/staff', id),
      () => deleteAdminRecord('/admin/users', id),
    ])
  },

  async assignDoctorToRoom(userId, roomId) {
    const normalizedRoomId = normalizeIdValue(roomId)
    const response = await requestFirst([
      () => apiClient
        .patch<BackendUserResponse>(`/users/${userId}`, { roomId: normalizedRoomId })
        .then((result) => result.data),
      () => apiClient
        .patch<BackendUserResponse>(`/users/${userId}`, { assignedRoomId: normalizedRoomId })
        .then((result) => result.data),
      () => apiClient
        .post<BackendUserResponse>(`/users/${userId}/assign-room`, { roomId: normalizedRoomId })
        .then((result) => result.data),
    ])

    return toUser(unwrapUser(response), 'specialist')
  },
}
