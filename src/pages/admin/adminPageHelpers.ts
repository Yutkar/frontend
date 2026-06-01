import type { AdminRecord, TicketSettingsServiceTypeOption } from '@services/api'
import type { Role, User } from '@shared/types'

export type AdminRoomRecord = AdminRecord & {
  active?: boolean
  isActive?: boolean
  name?: string
  roomName?: string
  serviceTypeIds?: Array<string | number>
  serviceTypes?: Array<string | number | { id?: string | number; name?: string }>
  status?: string
}

export const roleLabels: Record<Role, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  specialist: 'Специалист',
}

export function getRoomName(room?: AdminRoomRecord): string {
  if (!room) {
    return 'Не назначен'
  }

  return room.name ?? room.roomName ?? `Кабинет ${room.id}`
}

export function getRoomActive(room: AdminRoomRecord): boolean {
  return room.isActive ?? room.active ?? room.status !== 'paused'
}

export function getRoomServiceTypeIds(room: AdminRoomRecord): string[] {
  if (Array.isArray(room.serviceTypeIds)) {
    return room.serviceTypeIds.map(String)
  }

  if (Array.isArray(room.serviceTypes)) {
    return room.serviceTypes.map((serviceType) => {
      if (typeof serviceType === 'object' && serviceType !== null) {
        return String(serviceType.id ?? serviceType.name ?? '')
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

export function getUserEmail(user: User): string {
  return user.email ?? 'Не указан'
}
