import {
  adminApi,
  toServiceError,
  type AdminRecord,
  type AdminRecordInput,
  type AdminUserInput,
  type TicketSettingsServiceTypeOption,
} from './api'
import { withOperationalRefresh } from './syncService'
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
  async getServiceTypes(): Promise<TicketSettingsServiceTypeOption[]> {
    try {
      return await adminApi.getServiceTypes()
    } catch (error) {
      console.error('adminService.getServiceTypes failed', error)
      throw toServiceError(error, 'Не удалось получить типы услуг')
    }
  },

  async getRooms(): Promise<AdminRecord[]> {
    try {
      return await adminApi.getRooms()
    } catch (error) {
      console.error('adminService.getRooms failed', error)
      throw toServiceError(error, 'Не удалось получить кабинеты')
    }
  },

  async createRoom(input: AdminRoomPayload): Promise<AdminRecord> {
    try {
      return await withOperationalRefresh(
        () => adminApi.createRoom(input as AdminRecordInput),
        'Кабинеты обновлены',
      )
    } catch (error) {
      console.error('adminService.createRoom failed', error)
      throw toServiceError(error, 'Не удалось создать кабинет')
    }
  },

  async updateRoom(id: string | number, input: AdminRoomPayload): Promise<AdminRecord> {
    try {
      return await withOperationalRefresh(
        () => adminApi.updateRoom(id, input as AdminRecordInput),
        'Кабинеты обновлены',
      )
    } catch (error) {
      console.error('adminService.updateRoom failed', error)
      throw toServiceError(error, 'Не удалось сохранить кабинет')
    }
  },

  async deleteRoom(id: string | number): Promise<void> {
    try {
      await withOperationalRefresh(
        () => adminApi.deleteRoom(id),
        'Кабинеты обновлены',
      )
    } catch (error) {
      console.error('adminService.deleteRoom failed', error)
      throw toServiceError(error, 'Не удалось удалить кабинет')
    }
  },

  async getStaff(): Promise<User[]> {
    try {
      const users = await adminApi.getUsers()

      return onlySpecialists(users)
    } catch (error) {
      console.error('adminService.getStaff failed', error)
      throw toServiceError(error, 'Не удалось получить персонал')
    }
  },

  async createDoctor(input: Omit<AdminUserPayload, 'role'> & { role?: 'specialist' }): Promise<User> {
    try {
      return await withOperationalRefresh(
        () => adminApi.createUser({
          ...input,
          role: 'specialist',
        } as AdminUserInput),
        'Персонал обновлён',
      )
    } catch (error) {
      console.error('adminService.createDoctor failed', error)
      throw toServiceError(error, 'Не удалось создать врача')
    }
  },

  async updateStaff(id: string | number, input: Partial<AdminUserPayload>): Promise<User> {
    try {
      return await withOperationalRefresh(
        () => adminApi.updateUser(id, input as Partial<AdminUserInput>),
        'Персонал обновлён',
      )
    } catch (error) {
      console.error('adminService.updateStaff failed', error)
      throw toServiceError(error, 'Не удалось сохранить врача')
    }
  },

  async deleteStaff(id: string | number): Promise<void> {
    try {
      await withOperationalRefresh(
        () => adminApi.deleteUser(id),
        'Персонал обновлён',
      )
    } catch (error) {
      console.error('adminService.deleteStaff failed', error)
      throw toServiceError(error, 'Не удалось удалить врача')
    }
  },

  async assignDoctorToRoom(userId: string | number, roomId: string | number): Promise<User> {
    try {
      return await withOperationalRefresh(
        () => adminApi.assignDoctorToRoom(userId, roomId),
        'Назначение кабинета обновлено',
      )
    } catch (error) {
      console.error('adminService.assignDoctorToRoom failed', error)
      throw toServiceError(error, 'Не удалось назначить кабинет врачу')
    }
  },

  async getManagers(): Promise<User[]> {
    try {
      const users = await adminApi.getUsers()

      return onlyManagers(users)
    } catch (error) {
      console.error('adminService.getManagers failed', error)
      throw toServiceError(error, 'Не удалось получить менеджеров')
    }
  },

  async createManager(input: Omit<AdminUserPayload, 'role'>): Promise<User> {
    try {
      return await withOperationalRefresh(
        () => adminApi.createUser({
          ...input,
          role: 'manager',
        } as AdminUserInput),
        'Менеджеры обновлены',
      )
    } catch (error) {
      console.error('adminService.createManager failed', error)
      throw toServiceError(error, 'Не удалось создать менеджера')
    }
  },

  async updateManager(id: string | number, input: Partial<AdminUserPayload>): Promise<User> {
    try {
      return await withOperationalRefresh(
        () => adminApi.updateUser(id, {
          ...input,
          role: 'manager',
        } as Partial<AdminUserInput>),
        'Менеджеры обновлены',
      )
    } catch (error) {
      console.error('adminService.updateManager failed', error)
      throw toServiceError(error, 'Не удалось сохранить менеджера')
    }
  },

  async deleteManager(id: string | number): Promise<void> {
    try {
      await withOperationalRefresh(
        () => adminApi.deleteUser(id),
        'Менеджеры обновлены',
      )
    } catch (error) {
      console.error('adminService.deleteManager failed', error)
      throw toServiceError(error, 'Не удалось удалить менеджера')
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      return await adminApi.getUsers()
    } catch (error) {
      console.error('adminService.getUsers failed', error)
      throw toServiceError(error, 'Не удалось получить пользователей')
    }
  },

  async createUser(input: AdminUserInput): Promise<User> {
    try {
      return await withOperationalRefresh(
        () => adminApi.createUser(input),
        'Пользователи обновлены',
      )
    } catch (error) {
      console.error('adminService.createUser failed', error)
      throw toServiceError(error, 'Не удалось создать пользователя')
    }
  },

  async updateUser(id: string | number, input: Partial<AdminUserInput>): Promise<User> {
    try {
      return await withOperationalRefresh(
        () => adminApi.updateUser(id, input),
        'Пользователи обновлены',
      )
    } catch (error) {
      console.error('adminService.updateUser failed', error)
      throw toServiceError(error, 'Не удалось сохранить пользователя')
    }
  },

  async deleteUser(id: string | number): Promise<void> {
    try {
      await withOperationalRefresh(
        () => adminApi.deleteUser(id),
        'Пользователи обновлены',
      )
    } catch (error) {
      console.error('adminService.deleteUser failed', error)
      throw toServiceError(error, 'Не удалось удалить пользователя')
    }
  },
}
