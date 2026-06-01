import {
  adminApi,
  type AdminRecord,
  type AdminRecordInput,
  type AdminUserInput,
  type TicketSettingsServiceTypeOption,
} from './api'
import type { User } from '@shared/types'

export type AdminRoomPayload = {
  active?: boolean
  isActive?: boolean
  name: string
  serviceTypeIds?: Array<string | number>
}

export type AdminUserPayload = AdminUserInput & {
  assignedRoomId?: string | number
  email?: string
  roomId?: string | number
}

function onlySpecialists(users: User[]): User[] {
  return users.filter((user) => user.role === 'specialist')
}

function onlyManagers(users: User[]): User[] {
  return users.filter((user) => user.role === 'manager')
}

export const adminService = {
  getServiceTypes(): Promise<TicketSettingsServiceTypeOption[]> {
    return adminApi.getServiceTypes()
  },

  getRooms(): Promise<AdminRecord[]> {
    return adminApi.getRooms()
  },

  createRoom(input: AdminRoomPayload): Promise<AdminRecord> {
    return adminApi.createRoom(input as AdminRecordInput)
  },

  updateRoom(id: string | number, input: AdminRoomPayload): Promise<AdminRecord> {
    return adminApi.updateRoom(id, input as AdminRecordInput)
  },

  deleteRoom(id: string | number): Promise<void> {
    return adminApi.deleteRoom(id)
  },

  async getStaff(): Promise<User[]> {
    const users = await adminApi.getUsers()

    return onlySpecialists(users)
  },

  createDoctor(input: Omit<AdminUserPayload, 'role'> & { role?: 'specialist' }): Promise<User> {
    return adminApi.createUser({
      ...input,
      role: 'specialist',
    } as AdminUserInput)
  },

  updateStaff(id: string | number, input: Partial<AdminUserPayload>): Promise<User> {
    return adminApi.updateUser(id, input as Partial<AdminUserInput>)
  },

  deleteStaff(id: string | number): Promise<void> {
    return adminApi.deleteUser(id)
  },

  assignDoctorToRoom(userId: string | number, roomId: string | number): Promise<User> {
    return adminApi.assignDoctorToRoom(userId, roomId)
  },

  async getManagers(): Promise<User[]> {
    const users = await adminApi.getUsers()

    return onlyManagers(users)
  },

  createManager(input: Omit<AdminUserPayload, 'role'>): Promise<User> {
    return adminApi.createUser({
      ...input,
      role: 'manager',
    } as AdminUserInput)
  },

  updateManager(id: string | number, input: Partial<AdminUserPayload>): Promise<User> {
    return adminApi.updateUser(id, {
      ...input,
      role: 'manager',
    } as Partial<AdminUserInput>)
  },

  deleteManager(id: string | number): Promise<void> {
    return adminApi.deleteUser(id)
  },

  getUsers(): Promise<User[]> {
    return adminApi.getUsers()
  },

  createUser(input: AdminUserInput): Promise<User> {
    return adminApi.createUser(input)
  },

  updateUser(id: string | number, input: Partial<AdminUserInput>): Promise<User> {
    return adminApi.updateUser(id, input)
  },

  deleteUser(id: string | number): Promise<void> {
    return adminApi.deleteUser(id)
  },
}
