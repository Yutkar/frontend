type RoomNameSource = {
  id?: string | number | null
  name?: string | number | null
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

export function formatRoomName(room?: RoomNameSource | null): string {
  if (!room) {
    return 'Кабинет не назначен'
  }

  const rawName = normalizeRoomText(room.name)
    || normalizeRoomText(room.roomName)
    || normalizeRoomText(room.title)

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
