import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CallBoard } from '@features/tv-board/CallBoard'
import { adminService } from '@services/adminService'
import { queueService } from '@services/queueService'
import type { BoardSettings } from '@services/api'
import { useLocale } from '@shared/locales/useLocale'
import type { Room, Ticket } from '@shared/types'
import { formatRoomName, getRoomBoardId, getRoomClosedLabel } from '@shared/utils'

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

function getBoardSettingsForRoute(settings: BoardSettings, roomId?: string, profileId?: string): BoardSettings {
  const profileById = profileId
    ? settings.profiles?.find((item) => String(item.id) === String(profileId))
    : undefined
  const profile = profileById ?? (roomId
    ? settings.profiles?.find((item) => (
      item.boardType === 'individual' && String(item.roomBoardId ?? '') === String(roomId)
    ))
    : settings.profiles?.find((item) => item.boardType === 'general'))

  if (!profile) {
    if (
      roomId &&
      settings.boardType === 'individual' &&
      String(settings.roomBoardId ?? '') === String(roomId)
    ) {
      return settings
    }

    if (!roomId && settings.boardType === 'general') {
      return settings
    }

    return defaultBoardSettings
  }

  return {
    ...settings,
    boardType: profile.boardType,
    recentCallsLimit: profile.recentCallsLimit,
    roomBoardId: profile.roomBoardId,
    showRecentCalls: profile.showRecentCalls,
    showTime: profile.showTime,
    template: profile.template,
    voiceEnabled: profile.voiceEnabled,
  }
}

function isRoomClosed(room?: Room): boolean {
  return Boolean(room && (room.active === false || room.isActive === false))
}

export function TvBoardPage() {
  const t = useLocale()
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId') ?? undefined
  const profileId = searchParams.get('profileId') ?? undefined
  const [error, setError] = useState<string | null>(null)
  const [boardSettings, setBoardSettings] = useState<BoardSettings>(defaultBoardSettings)
  const [rooms, setRooms] = useState<Room[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [roomName, setRoomName] = useState<string>('')
  const [now, setNow] = useState(new Date())
  const [boardDataReady, setBoardDataReady] = useState(false)

  useEffect(() => {
    const clockInterval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(clockInterval)
  }, [])

  useEffect(() => {
    let active = true

    const loadSettings = () => {
      adminService.getBoardSettings()
        .then((nextSettings) => {
          if (active) {
            setBoardSettings(nextSettings)
          }
        })
        .catch((settingsError) => {
          console.error('Board settings load failed', settingsError)
        })
    }

    loadSettings()
    const interval = window.setInterval(loadSettings, 5_000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let active = true
    let requestId = 0

    setBoardDataReady(false)

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
        setBoardDataReady(true)
      } catch (error) {
        console.error('Board load failed', error)
        if (!active || currentRequestId !== requestId) return
        setError(t.board.waiting)
        setTickets([])
        setRooms([])
        setBoardDataReady(false)
      }
    }

    void load()
    const interval = window.setInterval(load, 3000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [roomId, t.board.waiting])

  const currentTime = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now)
  const routeBoardSettings = getBoardSettingsForRoute(boardSettings, roomId, profileId)
  const boardRoom = roomId
    ? rooms.find((room) => getRoomBoardId(room) === roomId || String(room.id) === roomId) ?? rooms[0]
    : undefined
  const roomClosed = Boolean(roomId) && isRoomClosed(boardRoom)
  const roomHeaderName = roomClosed && roomName && tickets.length > 0 ? `${roomName} — закрыт` : roomName

  return (
    <main className="tv-board">
      {roomHeaderName ? (
        <header className="tv-header">
          <strong>{roomHeaderName}</strong>
        </header>
      ) : null}
      {error ? (
        <section className="empty-state">
          <h2>{error}</h2>
        </section>
      ) : null}
      {roomClosed && tickets.length === 0 ? (
        <section className="tv-closed-state">
          <h1>{getRoomClosedLabel(boardRoom)}</h1>
        </section>
      ) : (
        <CallBoard
          currentTime={currentTime}
          dataReady={boardDataReady}
          recentCallsLimit={routeBoardSettings.recentCallsLimit}
          rooms={rooms}
          showRecentCalls={routeBoardSettings.showRecentCalls}
          showTime={routeBoardSettings.showTime}
          template={routeBoardSettings.template}
          tickets={tickets}
          voiceEnabled={routeBoardSettings.voiceEnabled}
          labels={t.board}
        />
      )}
    </main>
  )
}
