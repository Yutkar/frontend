import type { Role, User } from '@shared/types'
import { apiClient } from '../client'
import type { AdminApi, AdminRecord, AdminRecordInput, AdminUserInput } from '../types'

type BackendUser = Partial<User> & {
  email?: string
  id: string | number
  role?: Role
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

function toAdminRecord(record: AdminRecord): AdminRecord {
  return {
    ...record,
    id: record.id,
  }
}

function toUser(user: BackendUser): User {
  const name = user.name ?? user.email ?? String(user.id)

  return {
    id: String(user.id),
    name,
    role: user.role ?? 'manager',
    department: user.department ?? 'SmartQ',
    roomId: user.roomId,
    avatarInitials: user.avatarInitials ?? getAvatarInitials(name),
  }
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
  const response = await apiClient.put<AdminRecord>(`${path}/${id}`, input)

  return toAdminRecord(response.data)
}

async function deleteAdminRecord(path: string, id: string | number) {
  await apiClient.delete(`${path}/${id}`)
}

export const backendAdminApi: AdminApi = {
  getRooms() {
    return getAdminRecords('/admin/rooms')
  },

  createRoom(input) {
    return createAdminRecord('/admin/rooms', input)
  },

  updateRoom(id, input) {
    return updateAdminRecord('/admin/rooms', id, input)
  },

  deleteRoom(id) {
    return deleteAdminRecord('/admin/rooms', id)
  },

  getStaff() {
    return getAdminRecords('/admin/staff')
  },

  createStaff(input) {
    return createAdminRecord('/admin/staff', input)
  },

  updateStaff(id, input) {
    return updateAdminRecord('/admin/staff', id, input)
  },

  deleteStaff(id) {
    return deleteAdminRecord('/admin/staff', id)
  },

  async getUsers() {
    const response = await apiClient.get<BackendUser[]>('/admin/users')

    return response.data.map(toUser)
  },

  async createUser(input: AdminUserInput) {
    const response = await apiClient.post<BackendUser>('/admin/users', input)

    return toUser(response.data)
  },

  async updateUser(id, input) {
    const response = await apiClient.put<BackendUser>(`/admin/users/${id}`, input)

    return toUser(response.data)
  },

  deleteUser(id) {
    return deleteAdminRecord('/admin/users', id)
  },
}
