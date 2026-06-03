import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CallBoard } from '@features/tv-board/CallBoard'
import { t } from '@shared/locales/useLocale'
import { publicApiClient } from '@services/api/client'
import type { Room, Ticket } from '@shared/types'
import { toArchitectureTickets } from '@services/api/backendAdapters'

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
        const converted = toArchitectureTickets(data)

        if (!active || currentRequestId !== requestId) return

        setTickets(converted)

        const uniqueRooms = new Map()
        data.forEach((t: any) => {
          if (t.room) {
            uniqueRooms.set(String(t.room.id), {
              id: String(t.room.id),
              name: t.room.name,
              serviceTypes: [],
            })
            if (roomId && String(t.room.id) === roomId) {
              setRoomName(t.room.name)
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
          <strong>{roomName ? `Табло — ${roomName}` : 'Общее табло'}</strong>
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