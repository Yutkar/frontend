export function formatEta(minutes: number): string {
  if (minutes <= 0) {
    return 'сейчас'
  }

  if (minutes < 60) {
    return `${minutes} мин`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest > 0 ? `${hours} ч ${rest} мин` : `${hours} ч`
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return '<1 мин'
  }

  return formatEta(minutes)
}

export function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}
