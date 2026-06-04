import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CallBoard } from '@features/tv-board/CallBoard'
import { t } from '@shared/locales/useLocale'
import { queueService } from '@services/queueService'
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
    let active = true
    let requestId = 0

    const load = async () => {
      const currentRequestId = requestId + 1
      requestId = currentRequestId

      try {
        const snapshot = await queueService.getBoardSnapshot()
        const filteredTickets = roomId
          ? snapshot.tickets.filter((ticket) => String(ticket.roomId) === roomId)
          : snapshot.tickets
        const filteredRooms = roomId
          ? snapshot.rooms.filter((room) => String(room.id) === roomId)
          : snapshot.rooms

        if (!active || currentRequestId !== requestId) return

        setTickets(filteredTickets)
        setRooms(filteredRooms)
        setRoomName(
          roomId
            ? filteredRooms[0]?.name ?? filteredTickets.find((ticket) => ticket.roomName)?.roomName ?? ''
            : '',
        )
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
