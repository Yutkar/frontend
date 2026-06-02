import { isAxiosError } from 'axios'
import type { Role, ServiceType, User } from '@shared/types'
import { apiClient } from '../client'
import type {
  AdminApi,
  AdminRecord,
  AdminRecordInput,
  AdminUserInput,
  TicketSettingsServiceTypeOption,
} from '../types'

type UnknownRecord = Record<string, unknown>

type BackendUser = Partial<User> & {
  assignedRoom?: UnknownRecord | null
  assignedRoomId?: string | number | null
  email?: string
  firstName?: string
  fullName?: string
  id?: string | number
  lastName?: string
  room?: UnknownRecord | null
  roomId?: string | number | null
  username?: string
  _id?: string | number
}

type BackendUserResponse = BackendUser & {
  access_token?: string
  accessToken?: string
  token?: string
  user?: BackendUser
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

const serviceLabelByCode: Record<ServiceType, string> = {
  billing: 'Оплата',
  consultation: 'Консультация',
  diagnostics: 'Рентген',
  laboratory: 'Анализы',
  pharmacy: 'Другое',
  registration: 'Другое',
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()

    return trimmed || undefined
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return undefined
}

function getId(value: UnknownRecord): string | number {
  const rawId = value.id ?? value.roomId ?? value._id ?? value.uuid

  return typeof rawId === 'string' || typeof rawId === 'number'
    ? rawId
    : `record-${Math.random().toString(36).slice(2, 8)}`
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

function normalizeIdValue(value: string | number): string | number {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) && String(value).trim() !== '' ? numberValue : value
}

function normalizeIdList(values?: Array<string | number>): Array<string | number> {
  return (values ?? []).map(normalizeIdValue)
}

function toArray(value: unknown, keys: string[] = []): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord)
  }

  if (!isRecord(value)) {
    return []
  }

  for (const key of keys) {
    const nested = value[key]

    if (Array.isArray(nested)) {
      return nested.filter(isRecord)
    }
  }

  if (Array.isArray(value.data)) {
    return value.data.filter(isRecord)
  }

  if (isRecord(value.data)) {
    return toArray(value.data, keys)
  }

  if (Array.isArray(value.items)) {
    return value.items.filter(isRecord)
  }

  return []
}

function isRole(value: unknown): value is Role {
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim().toLowerCase()

  return normalized === 'admin' || normalized === 'manager' || normalized === 'specialist'
}

function toRole(value: unknown, fallbackRole: Role = 'specialist'): Role {
  if (!isRole(value)) {
    return fallbackRole
  }

  return value.trim().toLowerCase() as Role
}

function toServiceCode(option: UnknownRecord): ServiceType {
  const rawCode = getText(option.code)
    ?? getText(option.name)
    ?? getText(option.title)
    ?? getText(option.value)
    ?? ''
  const normalized = rawCode.trim().toLowerCase()

  return serviceCodeByBackendName[normalized] ?? 'consultation'
}

function toServiceTypeOption(option: UnknownRecord): TicketSettingsServiceTypeOption {
  const code = toServiceCode(option)

  return {
    code,
    id: getId(option),
    name: serviceLabelByCode[code],
  }
}

function getServiceTypeIds(record: UnknownRecord): Array<string | number> {
  const rawServiceTypeIds = record.serviceTypeIds
    ?? record.serviceIds
    ?? record.servicesIds

  if (Array.isArray(rawServiceTypeIds)) {
    return rawServiceTypeIds
      .map((item) => typeof item === 'string' || typeof item === 'number' ? item : undefined)
      .filter((item): item is string | number => item !== undefined)
  }

  const rawServices = record.serviceTypes ?? record.services

  if (!Array.isArray(rawServices)) {
    return []
  }

  return rawServices
    .map((service) => {
      if (typeof service === 'string' || typeof service === 'number') {
        return service
      }

      if (isRecord(service)) {
        const id = service.id ?? service._id ?? service.serviceTypeId ?? service.name ?? service.title

        return typeof id === 'string' || typeof id === 'number' ? id : undefined
      }

      return undefined
    })
    .filter((item): item is string | number => item !== undefined)
}

function toRoomRecord(record: UnknownRecord): AdminRecord {
  const name = getText(record.name)
    ?? getText(record.title)
    ?? getText(record.roomName)
    ?? 'Кабинет без названия'
  const isActive = typeof record.isActive === 'boolean'
    ? record.isActive
    : typeof record.active === 'boolean'
      ? record.active
      : record.status !== 'paused'
  const serviceTypeIds = getServiceTypeIds(record)

  return {
    ...record,
    active: isActive,
    id: getId(record),
    isActive,
    name,
    serviceTypeIds,
  }
}

function getRoomId(user: BackendUser): string | undefined {
  const roomId = user.roomId
    ?? user.assignedRoomId
    ?? (isRecord(user.room) ? user.room.id : undefined)
    ?? (isRecord(user.assignedRoom) ? user.assignedRoom.id : undefined)

  return roomId == null ? undefined : String(roomId)
}

function toUser(user: BackendUser, fallbackRole: Role = 'specialist'): User {
  const role = toRole(user.role, fallbackRole)
  const joinedName = [getText(user.firstName), getText(user.lastName)].filter(Boolean).join(' ')
  const name = getText(user.name)
    ?? getText(user.fullName)
    ?? joinedName
    ?? getText(user.username)
    ?? getText(user.email)
    ?? 'Без имени'
  const roomId = getRoomId(user)

  return {
    assignedRoomId: roomId,
    avatarInitials: user.avatarInitials ?? getAvatarInitials(name),
    department: user.department ?? (role === 'manager' ? 'Управление очередью' : 'Кабинет'),
    email: getText(user.email),
    id: String(user.id ?? user._id ?? ''),
    name,
    role,
    roomId,
  }
}

function unwrapUser(response: BackendUserResponse): BackendUser {
  return response.user ?? response
}

function hasUserId(user: User): boolean {
  return user.id.trim() !== '' && user.id !== 'undefined' && user.id !== 'null'
}

function getDesiredRoomId(input: Partial<AdminUserInput>): string | number | undefined {
  const roomId = input.roomId ?? input.assignedRoomId

  return typeof roomId === 'string' || typeof roomId === 'number' ? roomId : undefined
}

function toRegisterPayload(input: AdminUserInput) {
  const roomId = getDesiredRoomId(input)
  return {
    email: input.email,
    name: input.name,
    password: input.password,
    role: input.role,
    roomId: roomId ? Number(roomId) : undefined,
  }
}

function toUserPayload(input: AdminUserInput) {
  const roomId = getDesiredRoomId(input)

  return {
    ...toRegisterPayload(input),
    ...(roomId ? { assignedRoomId: normalizeIdValue(roomId), roomId: normalizeIdValue(roomId) } : {}),
  }
}

function toRoomCreatePayload(input: AdminRecordInput) {
  const name = getText(input.name) ?? getText(input.title) ?? ''
  const serviceTypeIds = normalizeIdList(input.serviceTypeIds as Array<string | number> | undefined)

  return {
    name,
    serviceTypeIds,
  }
}

function toRoomUpdatePayload(input: AdminRecordInput) {
  const createPayload = toRoomCreatePayload(input)
  const isActive = typeof input.isActive === 'boolean'
    ? input.isActive
    : typeof input.active === 'boolean'
      ? input.active
      : undefined

  return {
    ...createPayload,
    ...(isActive === undefined ? {} : { active: isActive, isActive }),
  }
}

function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response
}

function getStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined
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

async function getAdminRecords(path: string, keys: string[]) {
  const response = await apiClient.get<unknown>(path)

  return toArray(response.data, keys)
}

async function getUsers(path: string) {
  const records = await getAdminRecords(path, ['users', 'staff'])

  return records.map((user) => toUser(user as BackendUser))
}

async function createRoom(path: string, input: AdminRecordInput) {
  const payload = toRoomCreatePayload(input)
  const response = await requestFirst([
    () => apiClient.post<unknown>(path, payload),
    () => apiClient.post<unknown>(path, {
      name: payload.name,
      services: payload.serviceTypeIds,
    }),
    () => apiClient.post<unknown>(path, {
      serviceTypeIds: payload.serviceTypeIds,
      title: payload.name,
    }),
  ])

  return toRoomRecord(isRecord(response.data) ? response.data : {})
}

async function updateRoom(path: string, id: string | number, input: AdminRecordInput) {
  const payload = toRoomUpdatePayload(input)
  const response = await requestFirst([
    () => apiClient.patch<unknown>(`${path}/${id}`, payload),
    () => apiClient.patch<unknown>(`${path}/${id}`, {
      active: payload.active,
      name: payload.name,
      services: payload.serviceTypeIds,
    }),
    () => apiClient.put<unknown>(`${path}/${id}`, payload),
  ])

  return toRoomRecord(isRecord(response.data) ? response.data : { id, ...payload })
}

async function deleteRecord(path: string, id: string | number) {
  await apiClient.delete(`${path}/${id}`)
}

async function fetchUsers(): Promise<User[]> {
  return requestFirst([
    () => getUsers('/auth/users'), 
    () => getUsers('/users'),
    () => getUsers('/staff'),
    () => getUsers('/admin/users'),
  ])
}

async function resolveCreatedUser(input: AdminUserInput, response: BackendUserResponse): Promise<User> {
  let user = toUser(unwrapUser(response), input.role)

  if (hasUserId(user)) {
    return user
  }

  const users = await fetchUsers().catch(() => [])
  const normalizedEmail = input.email?.trim().toLowerCase()
  const foundUser = users.find((item) => (
    normalizedEmail && item.email?.trim().toLowerCase() === normalizedEmail
  )) ?? users.find((item) => item.name === input.name && item.role === input.role)

  if (foundUser) {
    return foundUser
  }

  user = {
    ...user,
    email: input.email,
    name: input.name,
    role: input.role,
    roomAssignmentPending: Boolean(getDesiredRoomId(input)),
  }

  return user
}

async function assignUserToRoom(userId: string | number, roomId: string | number) {
  const normalizedRoomId = normalizeIdValue(roomId)
  const response = await requestFirst([
    () => apiClient
      .patch<BackendUserResponse>(`/users/${userId}`, { roomId: normalizedRoomId })
      .then((result) => result.data),
    () => apiClient
      .patch<BackendUserResponse>(`/users/${userId}`, { assignedRoomId: normalizedRoomId })
      .then((result) => result.data),
    () => apiClient
      .patch<BackendUserResponse>(`/staff/${userId}`, { roomId: normalizedRoomId })
      .then((result) => result.data),
    () => apiClient
      .post<BackendUserResponse>(`/users/${userId}/assign-room`, { roomId: normalizedRoomId })
      .then((result) => result.data),
  ])

  return toUser(unwrapUser(response), 'specialist')
}

function getDeleteUserError(error: unknown): Error {
  if (isNetworkError(error)) {
    return new Error('Проверьте подключение к backend')
  }

  const status = getStatus(error)

  if (status === 404 || status === 405 || status === 501) {
    return new Error('Удаление пользователя пока не поддерживается backend.')
  }

  return new Error('Не удалось удалить врача')
}

export const backendAdminApi: AdminApi = {
  async getServiceTypes() {
    const response = await apiClient.get<unknown>('/service-types')

    return toArray(response.data, ['serviceTypes', 'services']).map(toServiceTypeOption)
  },

  getRooms() {
    const getRoomsRecords = async (path: string) => {
      const records = await getAdminRecords(path, ['rooms'])
      return records.map(toRoomRecord)
    }
    return requestFirst([
      () => getRoomsRecords('/rooms'),
      () => getRoomsRecords('/admin/rooms'),
    ])
  },

  createRoom(input) {
    return requestFirst([
      () => createRoom('/rooms', input),
      () => createRoom('/admin/rooms', input),
    ])
  },

  updateRoom(id, input) {
    return requestFirst([
      () => updateRoom('/rooms', id, input),
      () => updateRoom('/admin/rooms', id, input),
    ])
  },

  deleteRoom(id) {
    return requestFirst([
      () => deleteRecord('/rooms', id),
      () => deleteRecord('/admin/rooms', id),
    ])
  },

  async getStaff() {
    const users = await fetchUsers()

    return users
      .filter((user) => user.role === 'specialist')
      .map((user) => ({ ...user }))
  },

  createStaff(input) {
    return requestFirst([
      () => apiClient.post<unknown>('/staff', input).then((response) => toRoomRecord(isRecord(response.data) ? response.data : {})),
      () => apiClient.post<unknown>('/admin/staff', input).then((response) => toRoomRecord(isRecord(response.data) ? response.data : {})),
    ])
  },

  updateStaff(id, input) {
    return requestFirst([
      () => apiClient.patch<unknown>(`/staff/${id}`, input).then((response) => toRoomRecord(isRecord(response.data) ? response.data : { id, ...input })),
      () => apiClient.patch<unknown>(`/admin/staff/${id}`, input).then((response) => toRoomRecord(isRecord(response.data) ? response.data : { id, ...input })),
    ])
  },

  deleteStaff(id) {
    return requestFirst([
      () => deleteRecord('/staff', id),
      () => deleteRecord('/admin/staff', id),
    ])
  },

  getUsers() {
    return fetchUsers()
  },

  async createUser(input: AdminUserInput) {
    const desiredRoomId = getDesiredRoomId(input)
    const response = await requestFirst([
      () => apiClient.post<BackendUserResponse>('/auth/register', toRegisterPayload(input)).then((result) => result.data),
      () => apiClient.post<BackendUserResponse>('/users', toUserPayload(input)).then((result) => result.data),
      () => apiClient.post<BackendUserResponse>('/admin/users', toUserPayload(input)).then((result) => result.data),
    ])

    const createdUser = await resolveCreatedUser(input, response)

    if (!desiredRoomId || !hasUserId(createdUser)) {
      return createdUser
    }

    try {
      return await assignUserToRoom(createdUser.id, desiredRoomId)
    } catch (error) {
      console.warn('backendAdminApi.createUser: room assignment failed after user creation', error)

      return {
        ...createdUser,
        roomAssignmentPending: true,
      }
    }
  },

  async updateUser(id, input) {
    const payload = {
      ...input,
      ...(input.password ? { password: input.password } : {}),
      ...(input.roomId ? { roomId: Number(input.roomId) } : {}),
    }
    
    const response = await requestFirst([
      () => apiClient.patch<BackendUserResponse>(`/auth/users/${id}`, payload).then((result) => result.data),
      () => apiClient.patch<BackendUserResponse>(`/users/${id}`, payload).then((result) => result.data),
      () => apiClient.patch<BackendUserResponse>(`/staff/${id}`, payload).then((result) => result.data),
      () => apiClient.put<BackendUserResponse>(`/users/${id}`, payload).then((result) => result.data),
      () => apiClient.put<BackendUserResponse>(`/admin/users/${id}`, payload).then((result) => result.data),
    ])

    return toUser(unwrapUser(response), input.role)
  },

  async deleteUser(id) {
    try {
      await requestFirst([
        () => deleteRecord('/users', id),
        () => deleteRecord('/staff', id),
        () => deleteRecord('/admin/users', id),
      ])
    } catch (error) {
      throw getDeleteUserError(error)
    }
  },

  assignDoctorToRoom(userId, roomId) {
    return assignUserToRoom(userId, roomId)
  },
}