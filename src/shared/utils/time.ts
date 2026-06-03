type TicketWaitingSource = {
  calledAt?: string | null
  completedAt?: string | null
  createdAt?: string | null
  serviceStartedAt?: string | null
  startedAt?: string | null
}

function parseTimestamp(value?: string | null): number | undefined {
  if (!value) {
    return undefined
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) ? timestamp : undefined
}

export function getWaitingMinutes(
  ticket: TicketWaitingSource,
  now: number | Date = Date.now(),
): number | null {
  const createdAt = parseTimestamp(ticket.createdAt)

  if (createdAt === undefined) {
    return null
  }

  const nowTime = typeof now === 'number' ? now : now.getTime()
  const endTime =
    parseTimestamp(ticket.completedAt) ??
    parseTimestamp(ticket.startedAt) ??
    parseTimestamp(ticket.serviceStartedAt) ??
    parseTimestamp(ticket.calledAt) ??
    nowTime
  const diffMinutes = Math.floor((endTime - createdAt) / 60_000)

  return Math.max(0, diffMinutes)
}

export function formatWaitingTime(minutes?: number | null): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) {
    return 'Нет данных'
  }

  const roundedMinutes = Math.max(0, Math.floor(minutes))

  if (roundedMinutes < 1) {
    return 'меньше минуты'
  }

  if (roundedMinutes < 60) {
    return `${roundedMinutes} мин`
  }

  const hours = Math.floor(roundedMinutes / 60)
  const restMinutes = roundedMinutes % 60

  return restMinutes > 0 ? `${hours} ч ${restMinutes} мин` : `${hours} ч`
}

export function getAverageWaitingMinutes(
  tickets: TicketWaitingSource[],
  now: number | Date = Date.now(),
): number | null {
  const waitingTimes = tickets
    .map((ticket) => getWaitingMinutes(ticket, now))
    .filter((minutes): minutes is number => minutes !== null)

  if (waitingTimes.length === 0) {
    return null
  }

  const total = waitingTimes.reduce((sum, minutes) => sum + minutes, 0)

  return Math.round(total / waitingTimes.length)
}
