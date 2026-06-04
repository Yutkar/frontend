import type { AdminRecord, TicketSettingsServiceTypeOption } from '@services/api'
import type { Role, User } from '@shared/types'

export type AdminRoomRecord = AdminRecord & {
  active?: boolean
  isActive?: boolean
  name?: string
  roomName?: string
  services?: Array<string | number | { id?: string | number; name?: string; serviceTypeId?: string | number; title?: string }>
  serviceTypeIds?: Array<string | number>
  serviceTypes?: Array<string | number | { id?: string | number; name?: string; serviceTypeId?: string | number; title?: string }>
  status?: string
  title?: string
}

export const roleLabels: Record<Role, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  specialist: 'Специалист',
}

export function getRoomName(room?: AdminRoomRecord): string {
  if (!room) {
    return 'Кабинет не назначен'
  }

  return room.name ?? room.title ?? room.roomName ?? 'Кабинет без названия'
}

export function getRoomActive(room: AdminRoomRecord): boolean {
  return room.isActive ?? room.active ?? room.status !== 'paused'
}

export function getRoomServiceTypeIds(room: AdminRoomRecord): string[] {
  if (Array.isArray(room.serviceTypeIds)) {
    return room.serviceTypeIds.map(String)
  }

  const services = room.serviceTypes ?? room.services

  if (Array.isArray(services)) {
    return services.map((serviceType) => {
      if (typeof serviceType === 'object' && serviceType !== null) {
        return String(serviceType.id ?? serviceType.serviceTypeId ?? serviceType.name ?? serviceType.title ?? '')
      }

      return String(serviceType)
    }).filter(Boolean)
  }

  return []
}

export function getServiceTypeNames(
  room: AdminRoomRecord,
  serviceTypes: TicketSettingsServiceTypeOption[],
): string {
  const selectedIds = getRoomServiceTypeIds(room)

  if (selectedIds.length === 0) {
    return 'Не выбраны'
  }

  return selectedIds
    .map((id) => serviceTypes.find((serviceType) => String(serviceType.id) === id)?.name ?? id)
    .join(', ')
}

export function getUserRoomId(user: User): string {
  return user.roomId ?? user.assignedRoomId ?? ''
}

export function getUserLogin(user: User): string {
  return user.email ?? 'Не указан'
}

export function getAdminErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    if (/[а-яё]/i.test(error.message)) {
      return error.message
    }

    if (error.message.includes('подключение')) {
      return `${fallbackMessage}. Проверьте подключение к backend.`
    }

    if (error.message.includes('backend')) {
      return error.message
    }
  }

  return `${fallbackMessage}. Проверьте подключение к backend.`
}
