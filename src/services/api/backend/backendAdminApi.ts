import { isAxiosError } from 'axios'
import type { Role, ServiceType, User } from '@shared/types'
import { apiClient, publicApiClient } from '../client'
import { fallbackServiceTypeOptions } from '../serviceTypeCatalog'
import type {
  AdminApi,
  AdminRecord,
  AdminRecordInput,
  AdminServiceTypeInput,
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
  const averageDurationMinutes = getPositiveNumber(
    option.averageDurationMinutes
      ?? option.average_duration_minutes
      ?? option.avgServiceMinutes
      ?? option.avg_service_minutes
      ?? option.durationMinutes
      ?? option.duration_minutes,
  )
  const priorityWeight = getPositiveNumber(
    option.priorityWeight
      ?? option.priority_weight
      ?? option.weight,
  )
  const active = typeof option.active === 'boolean'
    ? option.active
    : typeof option.isActive === 'boolean'
      ? option.isActive
      : typeof option.enabled === 'boolean'
        ? option.enabled
        : undefined

  return {
    ...(active === undefined ? {} : { active }),
    ...(averageDurationMinutes === undefined ? {} : { averageDurationMinutes }),
    code,
    id: getId(option),
    name: getText(option.name)
      ?? getText(option.title)
      ?? getText(option.label)
      ?? getText(option.code)
      ?? serviceLabelByCode[code],
    ...(priorityWeight === undefined ? {} : { priorityWeight }),
  }
}

function getServiceTypeRecord(value: unknown): UnknownRecord | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  for (const key of ['serviceType', 'service_type', 'data', 'item', 'record']) {
    const nested = value[key]

    if (isRecord(nested)) {
      return nested
    }
  }

  return value
}

function toServiceTypeResponseOption(
  value: unknown,
  fallback: Partial<TicketSettingsServiceTypeOption> & Partial<AdminServiceTypeInput>,
): TicketSettingsServiceTypeOption {
  return toServiceTypeOption({
    ...fallback,
    ...(getServiceTypeRecord(value) ?? {}),
  })
}

function getPositiveNumber(value: unknown): number | undefined {
  const numberValue = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : Number.NaN

  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined
}

function toServiceTypePayload(input: Partial<AdminServiceTypeInput>) {
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.averageDurationMinutes !== undefined
      ? { averageDurationMinutes: Math.max(1, Math.round(input.averageDurationMinutes)) }
      : {}),
    ...(input.priorityWeight !== undefined
      ? { priorityWeight: Math.max(0, Math.round(input.priorityWeight)) }
      : {}),
    ...(input.active === undefined ? {} : { active: input.active, isActive: input.active }),
  }
}

function getServiceTypeIds(record: UnknownRecord): Array<string | number> {
  const singleServiceTypeId = record.serviceTypeId ?? record.service_type_id

  if (typeof singleServiceTypeId === 'string' || typeof singleServiceTypeId === 'number') {
    return [singleServiceTypeId]
  }

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
      : record.status !== 'paused' && record.status !== 'inactive' && record.status !== 'deleted'
  const serviceTypeIds = getServiceTypeIds(record)
  const ticketIssueEnabled = typeof record.ticketIssueEnabled === 'boolean'
    ? record.ticketIssueEnabled
    : typeof record.isTicketIssueEnabled === 'boolean'
      ? record.isTicketIssueEnabled
      : typeof record.kioskEnabled === 'boolean'
        ? record.kioskEnabled
        : undefined

  return {
    ...record,
    active: isActive,
    id: getId(record),
    isActive,
    ...(ticketIssueEnabled === undefined ? {} : { ticketIssueEnabled, isTicketIssueEnabled: ticketIssueEnabled }),
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
  return {
    email: input.email?.trim(),
    name: input.name.trim(),
    password: input.password?.trim(),
    role: input.role,
  }
}

function toUserUpdatePayload(input: Partial<AdminUserInput>) {
  const roomId = getDesiredRoomId(input)
  const payload: UnknownRecord = {}

  if (input.name?.trim()) {
    payload.name = input.name.trim()
  }

  if (input.email?.trim()) {
    payload.email = input.email.trim()
  }

  if (input.role) {
    payload.role = input.role
  }

  if (input.password?.trim()) {
    payload.password = input.password.trim()
  }

  if (roomId) {
    payload.assignedRoomId = normalizeIdValue(roomId)
    payload.roomId = normalizeIdValue(roomId)
  }

  return payload
}

function toRoomCreatePayload(input: AdminRecordInput) {
  const name = getText(input.name) ?? getText(input.title) ?? ''
  const serviceTypeIds = normalizeIdList(input.serviceTypeIds as Array<string | number> | undefined)
  const ticketIssueEnabled = typeof input.ticketIssueEnabled === 'boolean'
    ? input.ticketIssueEnabled
    : typeof input.isTicketIssueEnabled === 'boolean'
      ? input.isTicketIssueEnabled
      : typeof input.kioskEnabled === 'boolean'
        ? input.kioskEnabled
        : undefined

  return {
    name,
    serviceTypeIds,
    ...(ticketIssueEnabled === undefined ? {} : { ticketIssueEnabled, isTicketIssueEnabled: ticketIssueEnabled }),
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
      isTicketIssueEnabled: payload.isTicketIssueEnabled,
      name: payload.name,
      services: payload.serviceTypeIds,
      ticketIssueEnabled: payload.ticketIssueEnabled,
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
    () => getUsers('/users'),
    () => getUsers('/staff'),
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
  ])

  return toUser(unwrapUser(response), 'specialist')
}

async function verifyCredentials(
  email: string | undefined,
  password: string | undefined,
  errorMessage: string,
  logScope: string,
): Promise<void> {
  const normalizedEmail = email?.trim()
  const normalizedPassword = password?.trim()

  if (!normalizedEmail || !normalizedPassword) {
    return
  }

  try {
    await publicApiClient.post('/auth/login', {
      email: normalizedEmail,
      password: normalizedPassword,
    })
  } catch (error) {
    console.warn(`${logScope}: credentials verification failed`, error)
    throw new Error(errorMessage)
  }
}

function verifyUpdatedCredentials(email?: string, password?: string): Promise<void> {
  return verifyCredentials(
    email,
    password,
    'Пароль не удалось изменить. Проверьте поддержку backend.',
    'backendAdminApi.updateUser',
  )
}

function verifyCreatedCredentials(email?: string, password?: string): Promise<void> {
  return verifyCredentials(
    email,
    password,
    'Не удалось создать аккаунт для входа',
    'backendAdminApi.createUser',
  )
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
    try {
      const response = await apiClient.get<unknown>('/service-types')

      const serviceTypes = toArray(response.data, ['serviceTypes', 'services']).map(toServiceTypeOption)

      return serviceTypes.length > 0 ? serviceTypes : fallbackServiceTypeOptions
    } catch (error) {
      console.warn('backendAdminApi: GET /service-types is not available, using fallback services', error)

      return fallbackServiceTypeOptions
    }
  },

  async createServiceType(input) {
    const response = await apiClient.post<unknown>('/service-types', toServiceTypePayload(input))

    return toServiceTypeResponseOption(response.data, input)
  },

  async updateServiceType(id, input) {
    const response = await apiClient.patch<unknown>(`/service-types/${id}`, toServiceTypePayload(input))

    return toServiceTypeResponseOption(response.data, { id, ...input })
  },

  deleteServiceType(id) {
    return deleteRecord('/service-types', id)
  },

  getRooms() {
    const getRoomsRecords = async (path: string) => {
      const records = await getAdminRecords(path, ['rooms'])
      return records.map(toRoomRecord)
    }
    return getRoomsRecords('/rooms')
  },

  createRoom(input) {
    return createRoom('/rooms', input)
  },

  updateRoom(id, input) {
    return updateRoom('/rooms', id, input)
  },

  deleteRoom(id) {
    return deleteRecord('/rooms', id)
  },

  async getStaff() {
    const users = await fetchUsers()

    return users
      .filter((user) => user.role === 'specialist')
      .map((user) => ({ ...user }))
  },

  createStaff(input) {
    return apiClient
      .post<unknown>('/staff', input)
      .then((response) => toRoomRecord(isRecord(response.data) ? response.data : {}))
  },

  updateStaff(id, input) {
    return apiClient
      .patch<unknown>(`/staff/${id}`, input)
      .then((response) => toRoomRecord(isRecord(response.data) ? response.data : { id, ...input }))
  },

  deleteStaff(id) {
    return deleteRecord('/staff', id)
  },

  getUsers() {
    return fetchUsers()
  },

  async createUser(input: AdminUserInput) {
    const desiredRoomId = getDesiredRoomId(input)
    let response: BackendUserResponse

    try {
      response = await apiClient
        .post<BackendUserResponse>('/auth/register', toRegisterPayload(input))
        .then((result) => result.data)
    } catch (error) {
      console.warn('backendAdminApi.createUser: account registration failed', error)
      throw new Error('Не удалось создать аккаунт для входа')
    }

    const createdUser = await resolveCreatedUser(input, response)

    await verifyCreatedCredentials(input.email, input.password)

    if (!desiredRoomId) {
      return createdUser
    }

    if (!hasUserId(createdUser)) {
      return {
        ...createdUser,
        roomAssignmentPending: true,
      }
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
    const payload = toUserUpdatePayload(input)
    
    const response = await requestFirst([
      () => apiClient.patch<BackendUserResponse>(`/users/${id}`, payload).then((result) => result.data),
      () => apiClient.patch<BackendUserResponse>(`/staff/${id}`, payload).then((result) => result.data),
    ])
    const updatedUser = toUser(unwrapUser(response), input.role)

    await verifyUpdatedCredentials(input.email ?? updatedUser.email, input.password)

    return updatedUser
  },

  async deleteUser(id) {
    try {
      await requestFirst([
        () => deleteRecord('/users', id),
        () => deleteRecord('/staff', id),
      ])
    } catch (error) {
      throw getDeleteUserError(error)
    }
  },

  assignDoctorToRoom(userId, roomId) {
    return assignUserToRoom(userId, roomId)
  },
}
