import {
  adminApi,
  toServiceError,
  type AdminRecord,
  type AdminRecordInput,
  type AdminServiceTypeInput,
  type AdminUserInput,
  type TicketSettingsServiceTypeOption,
} from './api'
import { refreshOperationalData, withOperationalRefresh } from './syncService'
import { notifyServiceTypesChanged } from './serviceTypeSync'
import type { User } from '@shared/types'

export type AdminRoomPayload = {
  active?: boolean
  isActive?: boolean
  isTicketIssueEnabled?: boolean
  kioskEnabled?: boolean
  name: string
  serviceTypeIds?: Array<string | number>
  ticketIssueEnabled?: boolean
}

export type AdminUserPayload = AdminUserInput & {
  assignedRoomId?: string | number
  email?: string
  roomId?: string | number
}

export type AdminServiceTypePayload = AdminServiceTypeInput

function onlySpecialists(users: User[]): User[] {
  return users.filter((user) => user.role === 'specialist')
}

function onlyManagers(users: User[]): User[] {
  return users.filter((user) => user.role === 'manager')
}

function normalizeId(value: string | number): string | number {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) && String(value).trim() !== '' ? numberValue : value
}

function getRoomServiceTypeIds(room: AdminRecord): string[] {
  const record = room as AdminRecord & {
    serviceTypeId?: string | number
    serviceTypeIds?: Array<string | number>
    serviceTypes?: Array<string | number | { _id?: string | number; id?: string | number; serviceTypeId?: string | number }>
    services?: Array<string | number | { _id?: string | number; id?: string | number; serviceTypeId?: string | number }>
  }

  if (record.serviceTypeId !== undefined) {
    return [String(record.serviceTypeId)]
  }

  if (Array.isArray(record.serviceTypeIds)) {
    return record.serviceTypeIds.map(String)
  }

  return [...(record.serviceTypes ?? []), ...(record.services ?? [])]
    .map((serviceType) => {
      if (typeof serviceType === 'string' || typeof serviceType === 'number') {
        return String(serviceType)
      }

      return String(serviceType.serviceTypeId ?? serviceType.id ?? serviceType._id ?? '')
    })
    .filter(Boolean)
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

  async createServiceType(input: AdminServiceTypePayload): Promise<TicketSettingsServiceTypeOption> {
    try {
      const serviceType = await withOperationalRefresh(
        () => adminApi.createServiceType(input),
        'Типы услуг обновлены',
      )

      notifyServiceTypesChanged()

      return serviceType
    } catch (error) {
      console.error('adminService.createServiceType failed', error)
      throw toServiceError(error, 'Не удалось создать тип услуги')
    }
  },

  async updateServiceType(
    id: string | number,
    input: Partial<AdminServiceTypePayload>,
  ): Promise<TicketSettingsServiceTypeOption> {
    try {
      const serviceType = await withOperationalRefresh(
        () => adminApi.updateServiceType(id, input),
        'Типы услуг обновлены',
      )

      notifyServiceTypesChanged()

      return serviceType
    } catch (error) {
      console.error('adminService.updateServiceType failed', error)
      throw toServiceError(error, 'Не удалось сохранить тип услуги')
    }
  },

  async deleteServiceType(id: string | number): Promise<void> {
    try {
      await withOperationalRefresh(
        () => adminApi.deleteServiceType(id),
        'Типы услуг обновлены',
      )
      notifyServiceTypesChanged()
    } catch (error) {
      console.error('adminService.deleteServiceType failed', error)
      throw toServiceError(error, 'Не удалось удалить тип услуги')
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

  async updateQueueRouting(serviceTypeId: string | number, roomIds: Array<string | number>): Promise<void> {
    try {
      const rooms = await adminApi.getRooms()
      const selectedRoomIds = new Set(roomIds.map(String))
      const normalizedServiceTypeId = String(serviceTypeId)

      await Promise.all(rooms.map((room) => {
        const roomId = String(room.id)
        const currentServiceTypeIds = getRoomServiceTypeIds(room)
        const nextServiceTypeIds = selectedRoomIds.has(roomId)
          ? Array.from(new Set([...currentServiceTypeIds, normalizedServiceTypeId]))
          : currentServiceTypeIds.filter((id) => id !== normalizedServiceTypeId)
        const changed = nextServiceTypeIds.length !== currentServiceTypeIds.length ||
          nextServiceTypeIds.some((id) => !currentServiceTypeIds.includes(id))

        if (!changed) {
          return Promise.resolve()
        }

        return adminApi.updateRoom(room.id, {
          active: typeof room.active === 'boolean' ? room.active : undefined,
          isActive: typeof room.isActive === 'boolean' ? room.isActive : undefined,
          isTicketIssueEnabled: typeof room.isTicketIssueEnabled === 'boolean' ? room.isTicketIssueEnabled : undefined,
          kioskEnabled: typeof room.kioskEnabled === 'boolean' ? room.kioskEnabled : undefined,
          name: typeof room.name === 'string' ? room.name : String(room.id),
          serviceTypeIds: nextServiceTypeIds.map(normalizeId),
          ticketIssueEnabled: typeof room.ticketIssueEnabled === 'boolean' ? room.ticketIssueEnabled : undefined,
        } as AdminRecordInput)
      }))

      await refreshOperationalData('Настройки очередей обновлены')
    } catch (error) {
      console.error('adminService.updateQueueRouting failed', error)
      throw toServiceError(error, 'Не удалось сохранить настройки очереди')
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
