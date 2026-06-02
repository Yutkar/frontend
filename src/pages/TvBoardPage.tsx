import { useEffect, useState } from 'react'
import { CallBoard } from '@features/tv-board/CallBoard'
import { t } from '@shared/locales/useLocale'
import { queueService } from '@services/queueService'
import type { Room, Ticket } from '@shared/types'

export function TvBoardPage() {
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  const [rooms, setRooms] = useState<Room[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await queueService.getBoardSnapshot()
        setError(null)
        setTickets(snapshot.tickets)
        setRooms(snapshot.rooms)
      } catch (error) {
        console.error('Board load failed', error)
        setError('Не удалось получить данные табло')
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
