import type { AdminRecord, TicketSettingsServiceTypeOption } from '@services/api'
import { getServiceOptionLabel } from '@features/tickets/ticketFormOptions'
import type { Role, User } from '@shared/types'
import { formatRoomName } from '@shared/utils'

export type AdminRoomRecord = AdminRecord & {
  active?: boolean
  isActive?: boolean
  isTicketIssueEnabled?: boolean
  kioskEnabled?: boolean
  name?: string
  number?: string | number
  placeType?: string
  place_type?: string
  roomName?: string
  roomId?: string | number
  services?: Array<string | number | { id?: string | number; name?: string; serviceTypeId?: string | number; title?: string }>
  serviceTypeId?: string | number
  serviceTypeIds?: Array<string | number>
  serviceTypes?: Array<string | number | { id?: string | number; name?: string; serviceTypeId?: string | number; title?: string }>
  status?: string
  ticketIssueEnabled?: boolean
  title?: string
  workEndTime?: string
  workStartTime?: string
  work_end_time?: string
  work_start_time?: string
  workingEndTime?: string
  workingStartTime?: string
}

export const roleLabels: Record<Role, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  specialist: 'Специалист',
}

export function getRoomName(room?: AdminRoomRecord): string {
  return formatRoomName(room)
}

export function getRoomActive(room: AdminRoomRecord): boolean {
  return room.isActive
    ?? room.active
    ?? (room.status !== 'paused' && room.status !== 'inactive' && room.status !== 'deleted')
}

export function getRoomTicketIssueEnabled(room: AdminRoomRecord): boolean {
  return (room.ticketIssueEnabled ?? room.isTicketIssueEnabled ?? room.kioskEnabled) !== false
}

export function getRoomServiceTypeIds(room: AdminRoomRecord): string[] {
  if (room.serviceTypeId !== undefined) {
    return [String(room.serviceTypeId)]
  }

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
    .map((id) => {
      const serviceType = serviceTypes.find((item) => String(item.id) === id)

      return serviceType ? getServiceOptionLabel(serviceType) : id
    })
    .join(', ')
}

export function getUserRoomId(user: User): string {
  return getUserRoomIds(user)[0] ?? ''
}

export function getUserRoomIds(user: User): string[] {
  return Array.from(new Set([
    user.roomId,
    user.assignedRoomId,
    ...(user.roomIds ?? []),
    ...(user.assignedRoomIds ?? []),
  ].filter((id): id is string => Boolean(id))))
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
