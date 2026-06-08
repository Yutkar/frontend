import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CallBoard } from '@features/tv-board/CallBoard'
import { adminService } from '@services/adminService'
import { queueService } from '@services/queueService'
import type { BoardSettings } from '@services/api'
import type { Room, Ticket } from '@shared/types'
import { formatRoomName } from '@shared/utils'

const defaultBoardSettings: BoardSettings = {
  boardType: 'general',
  recentCallsLimit: 10,
  roomBoardId: '',
  screens: [],
  showRecentCalls: true,
  showTime: true,
  template: 'classic',
  voiceEnabled: true,
}

export function TvBoardPage() {
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId') ?? undefined
  const [error, setError] = useState<string | null>(null)
  const [boardSettings, setBoardSettings] = useState<BoardSettings>(defaultBoardSettings)
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

    adminService.getBoardSettings()
      .then((nextSettings) => {
        if (active) {
          setBoardSettings(nextSettings)
        }
      })
      .catch((settingsError) => {
        console.error('Board settings load failed', settingsError)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    let requestId = 0

    const load = async () => {
      const currentRequestId = requestId + 1
      requestId = currentRequestId

      try {
        const snapshot = await queueService.getBoardSnapshot(roomId)

        if (!active || currentRequestId !== requestId) return

        const nextTickets: Ticket[] = snapshot.tickets
        const nextRooms: Room[] = snapshot.rooms

        setTickets(nextTickets)
        setRooms(nextRooms)
        setRoomName(roomId
          ? formatRoomName(nextRooms[0] ?? { id: roomId })
          : '')
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
      {roomName || boardSettings.showTime ? (
        <header className={roomName ? 'tv-header' : 'tv-header tv-header-general'}>
          {roomName ? <strong>{roomName}</strong> : <span />}
          {boardSettings.showTime ? (
            <time>
              {new Intl.DateTimeFormat('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }).format(now)}
            </time>
          ) : null}
        </header>
      ) : null}
      {error ? (
        <section className="empty-state">
          <h2>{error}</h2>
        </section>
      ) : null}
      <CallBoard
        recentCallsLimit={boardSettings.recentCallsLimit}
        rooms={rooms}
        showRecentCalls={boardSettings.showRecentCalls}
        showTime={boardSettings.showTime}
        template={boardSettings.template}
        tickets={tickets}
        voiceEnabled={boardSettings.voiceEnabled}
      />
    </main>
  )
}
