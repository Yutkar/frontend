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
export const activeQueueStatuses = new Set<TicketStatus>(['created', 'waiting', 'called', 'in_service', 'redirected'])
const overloadLoadPercent = 75

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
  const serviceTypes = options.serviceTypes.length > 0 ? options.serviceTypes : fallbackServiceTypes

  return serviceTypes.filter((serviceType) => serviceType.active !== false)
}

function normalizeServiceId(value?: string | number | null): string {
  return value == null ? '' : String(value)
}

function getFallbackRoomServiceIds(room: Room): string[] {
  const record = room as Room & {
    serviceTypeId?: string | number
    serviceTypeIds?: Array<string | number>
    serviceTypes?: Array<string | number | { _id?: string | number; id?: string | number; serviceTypeId?: string | number }>
    services?: Array<string | number | { _id?: string | number; id?: string | number; serviceTypeId?: string | number }>
    ticketIssueEnabled?: boolean
    isTicketIssueEnabled?: boolean
    kioskEnabled?: boolean
  }

  return getRoomServiceIds(record)
}

export function getRoomServiceIds(room: TicketSettingsRoomOption): string[] {
  const singleId = normalizeServiceId(room.serviceTypeId)
  const explicitIds = Array.isArray(room.serviceTypeIds)
    ? room.serviceTypeIds.map(normalizeServiceId)
    : []
  const nestedServices = [...(room.serviceTypes ?? []), ...(room.services ?? [])]
    .map((service) => {
      if (typeof service === 'string' || typeof service === 'number') {
        return normalizeServiceId(service)
      }

      return normalizeServiceId(service.serviceTypeId ?? service.id ?? service._id ?? service.name ?? service.title)
    })

  return Array.from(new Set([singleId, ...explicitIds, ...nestedServices].filter(Boolean)))
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
      isTicketIssueEnabled: room.isTicketIssueEnabled,
      kioskEnabled: room.kioskEnabled,
      name: room.name,
      roomId: room.roomId,
      roomName: room.roomName,
      serviceTypeId: room.serviceTypeId,
      serviceTypeIds: room.serviceTypeIds,
      serviceTypes: room.serviceTypes,
      services: room.services,
      ticketIssueEnabled: room.ticketIssueEnabled,
      title: room.title,
    }))

  fallbackRooms
    .filter((room) => room.isActive !== false && room.status !== 'paused')
    .forEach((room) => {
      if (!mergedRooms.some((item) => String(item.id) === room.id)) {
        mergedRooms.push({
          id: room.id,
          name: room.name,
          serviceTypeId: room.serviceTypeId,
          serviceTypeIds: getFallbackRoomServiceIds(room),
          serviceTypes: room.serviceTypes,
          services: room.services,
          ticketIssueEnabled: room.ticketIssueEnabled,
          isTicketIssueEnabled: room.isTicketIssueEnabled,
          kioskEnabled: room.kioskEnabled,
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

export function getRoomLoadPercent(room: TicketSettingsRoomOption, fallbackRooms: Room[]): number {
  const roomId = normalizeServiceId(room.id)
  const fallbackRoom = fallbackRooms.find((item) => normalizeServiceId(item.id) === roomId)
  const roomWithLoad = room as TicketSettingsRoomOption & {
    loadPercent?: number
    workload?: number
  }

  return fallbackRoom?.loadPercent ?? roomWithLoad.loadPercent ?? fallbackRoom?.workload ?? roomWithLoad.workload ?? 0
}

export function isRoomTicketIssueEnabled(room: TicketSettingsRoomOption, fallbackRooms: Room[]): boolean {
  const roomId = normalizeServiceId(room.id)
  const fallbackRoom = fallbackRooms.find((item) => normalizeServiceId(item.id) === roomId)
  const issueEnabled = room.ticketIssueEnabled
    ?? room.isTicketIssueEnabled
    ?? room.kioskEnabled
    ?? fallbackRoom?.ticketIssueEnabled
    ?? fallbackRoom?.isTicketIssueEnabled
    ?? fallbackRoom?.kioskEnabled

  return issueEnabled !== false
}

export function isRoomAvailableForTicket(room: TicketSettingsRoomOption, fallbackRooms: Room[]): boolean {
  const roomId = normalizeServiceId(room.id)
  const fallbackRoom = fallbackRooms.find((item) => normalizeServiceId(item.id) === roomId)
  const isActive = room.isActive !== false &&
    room.active !== false &&
    fallbackRoom?.active !== false &&
    fallbackRoom?.isActive !== false &&
    fallbackRoom?.status !== 'paused'

  return isActive && isRoomTicketIssueEnabled(room, fallbackRooms) && getRoomLoadPercent(room, fallbackRooms) < overloadLoadPercent
}

export function getRoomQueueCount(roomId: string | number, tickets: Array<{ roomId?: string | number; status: TicketStatus }>): number {
  const normalizedRoomId = normalizeServiceId(roomId)

  return tickets.filter((ticket) =>
    normalizeServiceId(ticket.roomId) === normalizedRoomId && activeQueueStatuses.has(ticket.status),
  ).length
}

export function getAutoRoomForService(
  rooms: TicketSettingsRoomOption[],
  fallbackRooms: Room[],
  tickets: Array<{ roomId?: string | number; status: TicketStatus }>,
): TicketSettingsRoomOption | undefined {
  return [...rooms]
    .filter((room) => isRoomAvailableForTicket(room, fallbackRooms))
    .sort((left, right) => {
      const leftId = normalizeServiceId(left.id)
      const rightId = normalizeServiceId(right.id)
      const queueDelta = getRoomQueueCount(leftId, tickets) - getRoomQueueCount(rightId, tickets)

      if (queueDelta !== 0) {
        return queueDelta
      }

      const loadDelta = getRoomLoadPercent(left, fallbackRooms) - getRoomLoadPercent(right, fallbackRooms)

      if (loadDelta !== 0) {
        return loadDelta
      }

      return left.name.localeCompare(right.name, 'ru')
    })[0]
}

export function getAutoSpecialistForRoom(
  roomId: string | number,
  specialists: TicketSettingsUserOption[],
): TicketSettingsUserOption | undefined {
  const normalizedRoomId = normalizeServiceId(roomId)

  return specialists.find((specialist) =>
    normalizeServiceId(specialist.roomId ?? specialist.assignedRoomId) === normalizedRoomId,
  )
}

export function getAvailableServiceTypes(
  options: TicketSettingsOptions,
  fallbackRooms: Room[],
  tickets: Array<{ roomId?: string | number; status: TicketStatus }>,
): TicketSettingsServiceTypeOption[] {
  return getServiceTypes(options).filter((serviceType) => {
    const serviceRooms = getRoomsForService(options, serviceType.id, fallbackRooms)

    return Boolean(getAutoRoomForService(serviceRooms, fallbackRooms, tickets))
  })
}
