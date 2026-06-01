import {
  adminApi,
  type AdminRecord,
  type AdminRecordInput,
  type AdminUserInput,
} from './api'
import type { User } from '@shared/types'

export const adminService = {
  getRooms(): Promise<AdminRecord[]> {
    return adminApi.getRooms()
  },

  createRoom(input: AdminRecordInput): Promise<AdminRecord> {
    return adminApi.createRoom(input)
  },

  updateRoom(id: string | number, input: AdminRecordInput): Promise<AdminRecord> {
    return adminApi.updateRoom(id, input)
  },

  deleteRoom(id: string | number): Promise<void> {
    return adminApi.deleteRoom(id)
  },

  getStaff(): Promise<AdminRecord[]> {
    return adminApi.getStaff()
  },

  createStaff(input: AdminRecordInput): Promise<AdminRecord> {
    return adminApi.createStaff(input)
  },

  updateStaff(id: string | number, input: AdminRecordInput): Promise<AdminRecord> {
    return adminApi.updateStaff(id, input)
  },

  deleteStaff(id: string | number): Promise<void> {
    return adminApi.deleteStaff(id)
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
