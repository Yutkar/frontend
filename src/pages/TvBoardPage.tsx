import { useEffect, useState } from 'react'
import { CallBoard } from '@features/tv-board/CallBoard'
import { queueService } from '@services/queueService'
import type { Room, Ticket } from '@shared/types'

export function TvBoardPage() {
  const [error, setError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  useEffect(() => {
    let active = true
    let requestId = 0

    const load = async () => {
      const currentRequestId = requestId + 1

      requestId = currentRequestId

      try {
        const snapshot = await queueService.getBoardSnapshot()

        if (!active || currentRequestId !== requestId) {
          return
        }

        setError(null)
        setTickets(snapshot.tickets)
        setRooms(snapshot.rooms)
      } catch (error) {
        console.error('Board load failed', error)
        if (!active || currentRequestId !== requestId) {
          return
        }

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
  }, [])

  return (
    <main className="tv-board">
      <header className="tv-header">
        <strong>Табло вызова</strong>
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
