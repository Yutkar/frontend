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
  const [now, setNow] = useState(new Date())
  const [rooms, setRooms] = useState<Room[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [roomName, setRoomName] = useState<string>('')

  useEffect(() => {
    const url = roomId ? `/queue/board/${roomId}` : '/queue/board'

    const load = async () => {
      try {
        const response = await publicApiClient.get(url)
        const data = response.data
        const converted = toArchitectureTickets(data)
        setTickets(converted)

        // Получаем уникальные кабинеты из талонов
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
        setError('Не удалось загрузить табло')
      }
    }

    void load()
    const interval = window.setInterval(load, 2000)
    return () => window.clearInterval(interval)
  }, [roomId])

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

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
          <p>Проверьте подключение к серверу.</p>
        </section>
      ) : null}
      <CallBoard rooms={rooms} tickets={tickets} />
    </main>
  )
}