type RoomNameSource = {
  id?: string | number | null
  name?: string | number | null
  number?: string | number | null
  roomId?: string | number | null
  roomName?: string | number | null
  title?: string | number | null
}

function normalizeRoomText(value?: string | number | null): string {
  return value == null ? '' : String(value).trim()
}

function isNumericRoomName(value: string): boolean {
  return /^\d+$/.test(value)
}

function extractRoomDigits(value?: string | number | null): string {
  const text = normalizeRoomText(value)
  const match = text.match(/\d+/)

  return match?.[0] ?? ''
}

export function getRoomBoardId(room?: RoomNameSource | null): string {
  if (!room) {
    return ''
  }

  const number = extractRoomDigits(room.number) || normalizeRoomText(room.number)

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

  const rawName = normalizeRoomText(room.name)
    || normalizeRoomText(room.roomName)
    || normalizeRoomText(room.title)
    || normalizeRoomText(room.number)

  if (rawName) {
    return /кабинет/i.test(rawName)
      ? rawName
      : isNumericRoomName(rawName)
        ? `Кабинет ${rawName}`
        : rawName
  }

  const roomId = normalizeRoomText(room.roomId) || normalizeRoomText(room.id)

  return roomId ? `Кабинет ${roomId}` : 'Кабинет не назначен'
}
