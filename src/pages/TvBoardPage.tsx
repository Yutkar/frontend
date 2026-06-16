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
import {
  formatRoomName,
  getRoomBoardId,
  getRoomClosedLabel,
  normalizeRoomLookupValue,
  roomMatchesIdentifier,
} from '@shared/utils'

const defaultBoardSettings: BoardSettings = {
  boardType: 'general',
  recentCallsLimit: 10,
  roomBoardId: '',
  roomIds: [],
  screens: [],
  showRecentCalls: true,
  showTime: true,
  template: 'classic',
  voiceEnabled: true,
}

type RouteBoardSettings = BoardSettings & {
  resolvedProfileId: string
}

function boardIdentifierEquals(left?: string | number | null, right?: string | number | null): boolean {
  const normalizedLeft = normalizeRoomLookupValue(left)
  const normalizedRight = normalizeRoomLookupValue(right)

  return Boolean(normalizedLeft && normalizedLeft === normalizedRight)
}

function getFallbackProfileId(settings: BoardSettings, roomId?: string): string {
  if (roomId) {
    return settings.profiles?.find((item) => (
      item.boardType === 'individual' && boardIdentifierEquals(item.roomBoardId, roomId)
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
      item.boardType === 'individual' && boardIdentifierEquals(item.roomBoardId, roomId)
    ))
    : settings.profiles?.find((item) => item.boardType === 'general'))

  if (!profile) {
    const resolvedProfileId = getFallbackProfileId(settings, roomId)

    if (
      roomId &&
      settings.boardType === 'individual' &&
      boardIdentifierEquals(settings.roomBoardId, roomId)
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
    roomIds: profile.roomIds ?? [],
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

function getRouteRoomIds(settings: RouteBoardSettings): string[] {
  if (settings.boardType === 'individual') {
    return settings.roomBoardId ? [settings.roomBoardId] : []
  }

  return settings.roomIds ?? []
}

function filterRoomsByBoardIds(rooms: Room[], roomIds: string[]): Room[] {
  if (roomIds.length === 0) {
    return rooms
  }

  return rooms.filter((room) => roomIds.some((roomId) => roomMatchesIdentifier(room, roomId)))
}

function filterTicketsByBoardIds(tickets: Ticket[], rooms: Room[], roomIds: string[]): Ticket[] {
  if (roomIds.length === 0) {
    return tickets
  }

  const selectedRoomIds = new Set(filterRoomsByBoardIds(rooms, roomIds).map((room) => String(room.id)))

  return tickets.filter((ticket) => (
    (ticket.roomId !== undefined && selectedRoomIds.has(String(ticket.roomId))) ||
    roomIds.some((roomId) => roomMatchesIdentifier({ id: ticket.roomId, name: ticket.roomName }, roomId))
  ))
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
        const nextBoardRoom = roomId
          ? nextRooms.find((room) => roomMatchesIdentifier(room, roomId)) ?? nextRooms[0]
          : undefined

        setTickets(nextTickets)
        setRooms(nextRooms)
        setRoomName(roomId
          ? formatRoomName(nextBoardRoom ?? { id: roomId })
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
  const selectedRouteRoomIds = roomId ? [] : getRouteRoomIds(routeBoardSettings)
  const visibleRooms = filterRoomsByBoardIds(rooms, selectedRouteRoomIds)
  const visibleTickets = filterTicketsByBoardIds(tickets, rooms, selectedRouteRoomIds)
  const boardRoom = roomId
    ? rooms.find((room) => roomMatchesIdentifier(room, roomId) || getRoomBoardId(room) === roomId || String(room.id) === roomId) ?? rooms[0]
    : undefined
  const roomClosed = Boolean(roomId) && isRoomClosed(boardRoom)
  const roomHeaderName = roomClosed && roomName && visibleTickets.length > 0 ? `${roomName} — закрыт` : roomName

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
    '--board-font-scale': boardStyleSettings.fontScalePercent / 100,
    '--board-history-background': boardStyleSettings.historyBackground,
    '--board-history-text': boardStyleSettings.historyText,
    background: boardStyleSettings.boardBackground,
    fontFamily: getBoardFontStack(boardStyleSettings.fontFamily),
  } as CSSProperties
  const screenFormatClass = boardStyleSettings.screenFormat === '4:3'
    ? 'board-format-4-3'
    : 'board-format-16-9'
  const boardClassName = `tv-board tv-board-${routeBoardSettings.template} ${screenFormatClass}`

  return (
    <main
      className={boardClassName}
      data-screen-format={boardStyleSettings.screenFormat}
      style={boardStyle}
    >
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
      {roomClosed && visibleTickets.length === 0 ? (
        <section className="tv-closed-state">
          <h1>{getRoomClosedLabel(boardRoom)}</h1>
        </section>
      ) : (
        <CallBoard
          dataReady={boardDataReady}
          promoMedia={promoMedia}
          recentCallsLimit={routeBoardSettings.recentCallsLimit}
          rooms={visibleRooms}
          showRecentCalls={routeBoardSettings.showRecentCalls}
          template={routeBoardSettings.template}
          tickets={visibleTickets}
          voiceEnabled={routeBoardSettings.voiceEnabled}
          labels={t.board}
        />
      )}
    </main>
  )
}
