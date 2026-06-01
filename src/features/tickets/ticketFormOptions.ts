import type {
  TicketSettingsOptions,
  TicketSettingsServiceTypeOption,
  TicketSettingsUserOption,
} from '@services/api'
import type {
  Room,
  ServiceType,
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
  'created',
  'waiting',
  'called',
  'in_service',
  'completed',
  'no_show',
  'redirected',
  'cancelled',
]

export const fallbackServiceTypes: TicketSettingsServiceTypeOption[] = [
  { id: 1, code: 'consultation', name: 'Консультация' },
  { id: 2, code: 'billing', name: 'Оплата' },
  { id: 3, code: 'diagnostics', name: 'Рентген' },
  { id: 4, code: 'laboratory', name: 'Анализы' },
  { id: 5, code: 'registration', name: 'Другое' },
]

const serviceLabelsByCode: Record<ServiceType, string> = {
  billing: 'Оплата',
  consultation: 'Консультация',
  diagnostics: 'Рентген',
  laboratory: 'Анализы',
  pharmacy: 'Другое',
  registration: 'Другое',
}

const serviceLabelsByName: Record<string, string> = {
  analysis: 'Анализы',
  billing: 'Оплата',
  consultation: 'Консультация',
  diagnostics: 'Рентген',
  laboratory: 'Анализы',
  other: 'Другое',
  payment: 'Оплата',
  registration: 'Другое',
  xray: 'Рентген',
  анализы: 'Анализы',
  другое: 'Другое',
  диагностика: 'Рентген',
  консультация: 'Консультация',
  лаборатория: 'Анализы',
  оплата: 'Оплата',
  регистрация: 'Другое',
  рентген: 'Рентген',
}

export function getServiceOptionLabel(option?: TicketSettingsServiceTypeOption): string {
  if (!option) {
    return 'Консультация'
  }

  return serviceLabelsByName[option.name.trim().toLowerCase()] ?? serviceLabelsByCode[option.code]
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
  const availableServiceTypes = options.serviceTypes.length > 0
    ? options.serviceTypes
    : fallbackServiceTypes

  return fallbackServiceTypes.map((fallbackServiceType) => {
    const fallbackLabel = getServiceOptionLabel(fallbackServiceType)

    return availableServiceTypes.find(
      (serviceType) => getServiceOptionLabel(serviceType) === fallbackLabel,
    ) ?? fallbackServiceType
  })
}

export function getRooms(options: TicketSettingsOptions, fallbackRooms: Room[] = []) {
  const mergedRooms = options.rooms
    .filter((room) => room.isActive !== false)
    .map((room) => ({
      id: room.id,
      name: room.name,
    }))

  fallbackRooms
    .filter((room) => room.isActive !== false && room.status !== 'paused')
    .forEach((room) => {
      if (!mergedRooms.some((item) => String(item.id) === room.id)) {
        mergedRooms.push({
          id: room.id,
          name: room.name,
        })
      }
    })

  return mergedRooms
}

export function getSpecialists(options: TicketSettingsOptions): TicketSettingsUserOption[] {
  return options.specialists
}
