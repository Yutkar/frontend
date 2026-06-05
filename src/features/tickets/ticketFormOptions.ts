import type {
  TicketSettingsOptions,
  TicketSettingsRoomOption,
  TicketSettingsServiceTypeOption,
  TicketSettingsUserOption,
} from '@services/api'
import { fallbackServiceTypeOptions } from '@services/api/serviceTypeCatalog'
import type {
  Room,
  TicketPriority,
  TicketStatus,
} from '@shared/types'
import {
  getPriorityMeta,
  getTicketStatusMeta,
} from '@shared/utils'

export const ticketPriorities: TicketPriority[] = [
  'low',
  'normal',
  'above_normal',
  'high',
  'critical',
]

export const ticketStatuses: TicketStatus[] = [
  'waiting',
  'called',
  'in_service',
  'completed',
  'no_show',
  'redirected',
  'cancelled',
]

export const fallbackServiceTypes = fallbackServiceTypeOptions

export function getServiceOptionLabel(option?: TicketSettingsServiceTypeOption): string {
  if (!option) {
    return 'Услуга не выбрана'
  }

  return option.name
}

export function getPriorityLabel(priority: TicketPriority): string {
  return getPriorityMeta(priority).label
}

export function getStatusLabel(status: TicketStatus): string {
  if (status === 'in_service') {
    return 'На обслуживании'
  }

  return getTicketStatusMeta(status).label
}

export function getServiceTypes(options: TicketSettingsOptions): TicketSettingsServiceTypeOption[] {
  return options.serviceTypes.length > 0 ? options.serviceTypes : fallbackServiceTypes
}

function normalizeServiceId(value?: string | number | null): string {
  return value == null ? '' : String(value)
}

function getFallbackRoomServiceIds(room: Room): string[] {
  const record = room as Room & {
    serviceTypeIds?: Array<string | number>
    serviceTypes?: Array<string | number | { id?: string | number; serviceTypeId?: string | number }>
    services?: Array<string | number | { id?: string | number; serviceTypeId?: string | number }>
  }

  return getRoomServiceIds(record)
}

export function getRoomServiceIds(room: TicketSettingsRoomOption): string[] {
  const explicitIds = Array.isArray(room.serviceTypeIds)
    ? room.serviceTypeIds.map(normalizeServiceId)
    : []
  const nestedServices = [...(room.serviceTypes ?? []), ...(room.services ?? [])]
    .map((service) => {
      if (typeof service === 'string' || typeof service === 'number') {
        return normalizeServiceId(service)
      }

      return normalizeServiceId(service.id ?? service.serviceTypeId ?? service.name ?? service.title)
    })

  return Array.from(new Set([...explicitIds, ...nestedServices].filter(Boolean)))
}

export function roomSupportsService(
  room: TicketSettingsRoomOption,
  serviceTypeId?: string | number,
): boolean {
  const serviceId = normalizeServiceId(serviceTypeId)

  if (!serviceId) {
    return true
  }

  return getRoomServiceIds(room).includes(serviceId)
}

export function getRooms(options: TicketSettingsOptions, fallbackRooms: Room[] = []): TicketSettingsRoomOption[] {
  const mergedRooms: TicketSettingsRoomOption[] = options.rooms
    .filter((room) => room.isActive !== false && room.active !== false)
    .map((room) => ({
      active: room.active,
      id: room.id,
      isActive: room.isActive,
      name: room.name,
      serviceTypeIds: room.serviceTypeIds,
      serviceTypes: room.serviceTypes,
      services: room.services,
    }))

  fallbackRooms
    .filter((room) => room.isActive !== false && room.status !== 'paused')
    .forEach((room) => {
      if (!mergedRooms.some((item) => String(item.id) === room.id)) {
        mergedRooms.push({
          id: room.id,
          name: room.name,
          serviceTypeIds: getFallbackRoomServiceIds(room),
        })
      }
    })

  return mergedRooms
}

export function getRoomsForService(
  options: TicketSettingsOptions,
  serviceTypeId?: string | number,
  fallbackRooms: Room[] = [],
): TicketSettingsRoomOption[] {
  return getRooms(options, fallbackRooms).filter((room) => roomSupportsService(room, serviceTypeId))
}

export function getSpecialists(options: TicketSettingsOptions): TicketSettingsUserOption[] {
  return options.specialists
}

export function getSpecialistsForRoom(
  options: TicketSettingsOptions,
  roomId?: string | number,
): TicketSettingsUserOption[] {
  const selectedRoomId = normalizeServiceId(roomId)
  const specialists = getSpecialists(options)

  if (!selectedRoomId) {
    return specialists
  }

  return specialists.filter((specialist) => (
    normalizeServiceId(specialist.roomId ?? specialist.assignedRoomId) === selectedRoomId
  ))
}
