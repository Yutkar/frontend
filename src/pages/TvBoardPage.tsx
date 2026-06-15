import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CallBoard } from '@features/tv-board/CallBoard'
import { adminService } from '@services/adminService'
import { boardPromoMediaService, type BoardPromoMedia } from '@services/boardPromoMediaService'
import {
  boardStyleSettingsService,
  defaultBoardStyleSettings,
  getBoardFontStack,
  type BoardStyleSettings,
} from '@services/boardStyleSettingsService'
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

type RouteBoardSettings = BoardSettings & {
  resolvedProfileId: string
}

function getFallbackProfileId(settings: BoardSettings, roomId?: string): string {
  if (roomId) {
    return settings.profiles?.find((item) => (
      item.boardType === 'individual' && String(item.roomBoardId ?? '') === String(roomId)
    ))?.id ?? `room-${roomId}`
  }

  return settings.profiles?.find((item) => item.boardType === 'general')?.id ?? 'general'
}

function getBoardSettingsForRoute(settings: BoardSettings, roomId?: string, profileId?: string): RouteBoardSettings {
  const profileById = profileId
    ? settings.profiles?.find((item) => String(item.id) === String(profileId))
    : undefined
  const profile = profileById ?? (roomId
    ? settings.profiles?.find((item) => (
      item.boardType === 'individual' && String(item.roomBoardId ?? '') === String(roomId)
    ))
    : settings.profiles?.find((item) => item.boardType === 'general'))

  if (!profile) {
    const resolvedProfileId = getFallbackProfileId(settings, roomId)

    if (
      roomId &&
      settings.boardType === 'individual' &&
      String(settings.roomBoardId ?? '') === String(roomId)
    ) {
      return { ...settings, resolvedProfileId }
    }

    if (!roomId && settings.boardType === 'general') {
      return { ...settings, resolvedProfileId }
    }

    return { ...defaultBoardSettings, resolvedProfileId }
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
    resolvedProfileId: profile.id,
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
  const [boardDataReady, setBoardDataReady] = useState(false)
  const [promoMedia, setPromoMedia] = useState<BoardPromoMedia>({})
  const [boardStyleSettings, setBoardStyleSettings] = useState<BoardStyleSettings>(defaultBoardStyleSettings)

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

  const routeBoardSettings = getBoardSettingsForRoute(boardSettings, roomId, profileId)
  const boardRoom = roomId
    ? rooms.find((room) => getRoomBoardId(room) === roomId || String(room.id) === roomId) ?? rooms[0]
    : undefined
  const roomClosed = Boolean(roomId) && isRoomClosed(boardRoom)
  const roomHeaderName = roomClosed && roomName && tickets.length > 0 ? `${roomName} — закрыт` : roomName
  const boardClassName = `tv-board tv-board-${routeBoardSettings.template}`

  useEffect(() => {
    const loadLocalBoardSettings = () => {
      setPromoMedia(boardPromoMediaService.getMedia(routeBoardSettings.resolvedProfileId))
      setBoardStyleSettings(boardStyleSettingsService.getSettings(routeBoardSettings.resolvedProfileId))
    }
    loadLocalBoardSettings()

    const interval = window.setInterval(loadLocalBoardSettings, 5_000)

    return () => window.clearInterval(interval)
  }, [routeBoardSettings.resolvedProfileId])

  const boardStyle = {
    '--board-accent-color': boardStyleSettings.accentColor,
    '--board-background': boardStyleSettings.boardBackground,
    '--board-border-color': boardStyleSettings.borderColor,
    '--board-current-background': boardStyleSettings.currentCallBackground,
    '--board-current-text': boardStyleSettings.currentCallText,
    '--board-history-background': boardStyleSettings.historyBackground,
    '--board-history-text': boardStyleSettings.historyText,
    background: boardStyleSettings.boardBackground,
    fontFamily: getBoardFontStack(boardStyleSettings.fontFamily),
  } as CSSProperties

  return (
    <main className={boardClassName} style={boardStyle}>
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
          dataReady={boardDataReady}
          promoMedia={promoMedia}
          recentCallsLimit={routeBoardSettings.recentCallsLimit}
          rooms={rooms}
          showRecentCalls={routeBoardSettings.showRecentCalls}
          template={routeBoardSettings.template}
          tickets={tickets}
          voiceEnabled={routeBoardSettings.voiceEnabled}
          labels={t.board}
        />
      )}
    </main>
  )
}
