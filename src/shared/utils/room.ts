import type { ServicePlaceType } from '@shared/types'

type RoomNameSource = {
  id?: string | number | null
  name?: string | number | null
  number?: string | number | null
  placeType?: ServicePlaceType | string | null
  place_type?: ServicePlaceType | string | null
  roomId?: string | number | null
  roomName?: string | number | null
  title?: string | number | null
}

type PlaceMeta = {
  label: string
  lowerLabel: string
  preposition: string
  type: ServicePlaceType
}

const defaultPlaceType: ServicePlaceType = 'room'

const placeTypeMeta: Record<ServicePlaceType, PlaceMeta> = {
  desk: {
    label: 'Стол',
    lowerLabel: 'столу',
    preposition: 'к',
    type: 'desk',
  },
  room: {
    label: 'Кабинет',
    lowerLabel: 'кабинет',
    preposition: 'в',
    type: 'room',
  },
  window: {
    label: 'Окно',
    lowerLabel: 'окну',
    preposition: 'к',
    type: 'window',
  },
}

function normalizeRoomText(value?: string | number | null): string {
  return value == null ? '' : String(value).trim()
}

function isNumericRoomName(value: string): boolean {
  return /^\d+$/.test(value)
}

function normalizePlaceType(value?: ServicePlaceType | string | null): ServicePlaceType | undefined {
  const text = normalizeRoomText(value).toLowerCase()

  if (text === 'window' || text === 'окно') return 'window'
  if (text === 'desk' || text === 'стол') return 'desk'
  if (text === 'room' || text === 'cabinet' || text === 'кабинет') return 'room'

  return undefined
}

function inferPlaceTypeFromText(value?: string | number | null): ServicePlaceType | undefined {
  const text = normalizeRoomText(value).toLowerCase()

  if (/^окно\b/.test(text)) return 'window'
  if (/^стол\b/.test(text)) return 'desk'
  if (/^кабинет\b/.test(text)) return 'room'

  return undefined
}

function hasPlaceLabel(value: string): boolean {
  return /^(кабинет|окно|стол)\b/i.test(value)
}

function extractRoomDigits(value?: string | number | null): string {
  const text = normalizeRoomText(value)
  const match = text.match(/\d+/)

  return match?.[0] ?? ''
}

export function getRoomPlaceType(room?: RoomNameSource | null): ServicePlaceType {
  if (!room) {
    return defaultPlaceType
  }

  return normalizePlaceType(room.placeType ?? room.place_type)
    ?? inferPlaceTypeFromText(room.name)
    ?? inferPlaceTypeFromText(room.roomName)
    ?? inferPlaceTypeFromText(room.title)
    ?? defaultPlaceType
}

export function getRoomPlaceNumber(room?: RoomNameSource | null): string {
  if (!room) {
    return ''
  }

  const rawNumber = normalizeRoomText(room.number)
  const number = rawNumber
    ? isNumericRoomName(rawNumber) ? rawNumber : extractRoomDigits(rawNumber) || rawNumber
    : ''

  return number
    || extractRoomDigits(room.name)
    || extractRoomDigits(room.title)
    || extractRoomDigits(room.roomName)
    || ''
}

export function getRoomBoardId(room?: RoomNameSource | null): string {
  if (!room) {
    return ''
  }

  const number = getRoomPlaceNumber(room)

  if (number) {
    return number
  }

  const namedId = extractRoomDigits(room.name)
    || extractRoomDigits(room.title)
    || extractRoomDigits(room.roomName)

  if (namedId) {
    return namedId
  }

  return normalizeRoomText(room.id)
}

export function formatRoomName(room?: RoomNameSource | null): string {
  if (!room) {
    return 'Кабинет не назначен'
  }

  const placeType = getRoomPlaceType(room)
  const placeLabel = placeTypeMeta[placeType].label
  const placeNumber = getRoomPlaceNumber(room)
  const rawName = normalizeRoomText(room.name)
    || normalizeRoomText(room.roomName)
    || normalizeRoomText(room.title)
    || normalizeRoomText(room.number)

  if (placeNumber) {
    return `${placeLabel} ${placeNumber}`
  }

  if (rawName) {
    return hasPlaceLabel(rawName)
      ? rawName
      : isNumericRoomName(rawName)
        ? `${placeLabel} ${rawName}`
        : rawName
  }

  const roomId = normalizeRoomText(room.roomId) || normalizeRoomText(room.id)

  return roomId ? `${placeLabel} ${roomId}` : 'Кабинет не назначен'
}

export function formatRoomVoiceTarget(room?: RoomNameSource | null): string {
  const placeType = getRoomPlaceType(room)
  const meta = placeTypeMeta[placeType]
  const placeNumber = getRoomPlaceNumber(room)
  const roomId = normalizeRoomText(room?.roomId) || normalizeRoomText(room?.id)
  const targetNumber = placeNumber || roomId

  return targetNumber
    ? `${meta.preposition} ${meta.lowerLabel} ${targetNumber}`
    : `${meta.preposition} ${meta.lowerLabel}`
}

export function getRoomPlaceTypeLabel(placeType: ServicePlaceType | string): string {
  return placeTypeMeta[normalizePlaceType(placeType) ?? defaultPlaceType].label
}
