import { useEffect, useState } from 'react'
import { CallBoard } from '@features/tv-board/CallBoard'
import { t } from '@shared/locales/useLocale'
import { queueApi } from '@services/api'
import type { Room, Ticket } from '@shared/types'

export function TvBoardPage() {
  const [now, setNow] = useState(new Date())
  const [rooms, setRooms] = useState<Room[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await queueApi.getBoardSnapshot()
        setTickets(snapshot.tickets)
        setRooms(snapshot.rooms)
      } catch (error) {
        console.error('Board load failed', error)
      }
    }

    void load()

    // Обновляем каждые 5 секунд
    const interval = window.setInterval(load, 5000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <main className="tv-board">
      <header className="tv-header">
        <div>
          <span>{t.system.smartq}</span>
          <strong>{t.queue.patientCallBoard}</strong>
        </div>
        <time>
          {new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(now)}
        </time>
      </header>
      <CallBoard rooms={rooms} tickets={tickets} />
    </main>
  )
}