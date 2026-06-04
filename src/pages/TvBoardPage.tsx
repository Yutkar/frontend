import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CallBoard } from '@features/tv-board/CallBoard'
import { t } from '@shared/locales/useLocale'
import { publicApiClient } from '@services/api/client'
import type { Room, Ticket } from '@shared/types'

export function TvBoardPage() {
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId')
  const [error, setError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [roomName, setRoomName] = useState<string>('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const clockInterval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(clockInterval)
  }, [])

  useEffect(() => {
    const url = roomId ? `/queue/board/${roomId}` : '/queue/board'
    let active = true
    let requestId = 0

    const load = async () => {
      const currentRequestId = requestId + 1
      requestId = currentRequestId

      try {
        const response = await publicApiClient.get(url)
        const data = response.data

        if (!active || currentRequestId !== requestId) return

        // Конвертируем вручную чтобы сохранить roomName
        const converted: Ticket[] = data.map((item: any) => ({
          id: String(item.id),
          number: item.number ?? `Талон ${item.id}`,
          status: item.status ?? 'waiting',
          priority: item.priority ?? 2,
          serviceType: item.serviceType?.name ?? 'consultation',
          createdAt: item.createdAt ?? new Date().toISOString(),
          calledAt: item.calledAt ?? undefined,
          updatedAt: item.updatedAt ?? undefined,
          startedAt: item.serviceStartedAt ?? undefined,
          completedAt: item.completedAt ?? undefined,
          roomId: item.roomId ? String(item.roomId) : undefined,
          roomName: item.room?.name ?? undefined,
          etaMinutes: item.etaMinutes ?? 0,
          patientName: `Пациент ${item.number ?? item.id}`,
        }))

        setTickets(converted)

        const uniqueRooms = new Map()
        data.forEach((item: any) => {
          if (item.room) {
            uniqueRooms.set(String(item.room.id), {
              id: String(item.room.id),
              name: item.room.name,
              serviceTypes: [],
            })
            if (roomId && String(item.room.id) === roomId) {
              setRoomName(item.room.name)
            }
          }
        })
        setRooms(Array.from(uniqueRooms.values()))
        setError(null)
      } catch (error) {
        console.error('Board load failed', error)
        if (!active || currentRequestId !== requestId) return
        setError('Не удалось загрузить табло')
        setTickets([])
        setRooms([])
      }
    }

    void load()
    const interval = window.setInterval(load, 3000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [roomId])

  return (
    <main className="tv-board">
      <header className="tv-header">
        <div>
          <span>{t.system.smartq}</span>
          <strong>{roomName ? `Табло вызовов — ${roomName}` : 'Табло вызовов'}</strong>
        </div>
        <time>
          {new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(now)}
        </time>
      </header>
      {error ? (
        <section className="empty-state">
          <h2>{error}</h2>
        </section>
      ) : null}
      <CallBoard rooms={rooms} tickets={tickets} />
    </main>
  )
}