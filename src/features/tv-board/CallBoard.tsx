import { useEffect, useMemo, useRef, useState } from 'react'
import { voiceSettingsService } from '@services/voiceSettingsService'
import type { BoardTemplate } from '@services/api'
import {
  getCurrentLanguage,
  getLocale,
  type SmartQLanguage,
} from '@shared/locales/useLocale'
import type { Room, Ticket } from '@shared/types'
import {
  formatRoomName,
  formatTime,
  getRoomPlaceNumber,
  getRoomPlaceType,
} from '@shared/utils'

type CallBoardProps = {
  labels?: {
    currentCall: string
    noShow: string
    recentCalls: string
    waiting: string
  }
  recentCallsLimit?: number
  rooms: Room[]
  showRecentCalls?: boolean
  showTime?: boolean
  template?: BoardTemplate
  tickets: Ticket[]
  voiceEnabled?: boolean
}

function getCallTime(ticket: Ticket): string {
  return ticket.calledAt ?? ticket.updatedAt ?? ticket.createdAt
}

function getCallTimestamp(ticket: Ticket): number {
  const timestamp = Date.parse(getCallTime(ticket))
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getTicketRoom(ticket: Ticket, rooms: Room[]): Room | {
  id?: string
  name?: string
  number?: string | number
  placeType?: string
} {
  const room = rooms.find((item) => String(item.id) === String(ticket.roomId))

  if (ticket.roomName) {
    return {
      ...room,
      id: ticket.roomId ?? room?.id,
      name: ticket.roomName,
    }
  }

  return room ?? { id: ticket.roomId }
}

function getRoomName(ticket: Ticket, rooms: Room[]): string {
  const room = getTicketRoom(ticket, rooms)

  return formatRoomName(room ?? { id: ticket.roomId })
}

function getCallKey(ticket?: Ticket): string {
  return ticket ? `${ticket.id}:${ticket.calledAt ?? ticket.createdAt}` : ''
}

function isBoardCallTicket(ticket: Ticket): boolean {
  return Boolean(ticket.calledAt)
    && (ticket.status === 'called' || ticket.status === 'in_service' || ticket.status === 'no_show')
}

function getSpeechLanguage(language: SmartQLanguage): string {
  if (language === 'kk') return 'kk-KZ'
  if (language === 'en') return 'en-US'

  return 'ru-RU'
}

function getEnglishPlaceType(room?: Room | {
  id?: string
  name?: string
  number?: string | number
  placeType?: string
}): string {
  const placeType = getRoomPlaceType(room)

  if (placeType === 'window') return 'window'
  if (placeType === 'desk') return 'desk'

  return 'room'
}

function getKazakhPlaceTarget(room?: Room | {
  id?: string
  name?: string
  number?: string | number
  placeType?: string
}): string {
  const placeType = getRoomPlaceType(room)
  const number = getRoomPlaceNumber(room)
  const fallbackId = room?.id ? String(room.id) : ''
  const placeNumber = number || fallbackId

  if (placeType === 'window') return `${placeNumber} терезеге`
  if (placeType === 'desk') return `${placeNumber} үстелге`

  return `${placeNumber} кабинетке`
}

function getRussianPlaceTarget(room?: Room | {
  id?: string
  name?: string
  number?: string | number
  placeType?: string
}): string {
  const placeType = getRoomPlaceType(room)
  const number = getRoomPlaceNumber(room)
  const fallbackId = room?.id ? String(room.id) : ''
  const placeNumber = number || fallbackId

  if (placeType === 'window') return `к окну ${placeNumber}`
  if (placeType === 'desk') return `к столу ${placeNumber}`

  return `в кабинет ${placeNumber}`
}

function buildVoicePhrase(
  ticketNumber: string,
  room: Room | {
    id?: string
    name?: string
    number?: string | number
    placeType?: string
  } | undefined,
  language: SmartQLanguage,
): string {
  const voiceSettings = voiceSettingsService.getSettings()
  const audience = voiceSettings.audience
  const roomNumber = getRoomPlaceNumber(room) || (room?.id ? String(room.id) : '')

  if (language === 'kk') {
    const audienceText = audience === 'client' ? 'клиенті' : 'пациенті'

    return `${ticketNumber} ${audienceText}, ${getKazakhPlaceTarget(room)} келіңіз`
  }

  if (language === 'en') {
    const audienceText = audience === 'client' ? 'Client' : 'Patient'

    return `${audienceText} ${ticketNumber}, please proceed to ${getEnglishPlaceType(room)} ${roomNumber}`
  }

  const locale = getLocale('ru')
  const audienceText = audience === 'client' ? locale.voice.client : locale.voice.patient
  const actionText = voiceSettings.action === 'enter' ? locale.voice.enter : locale.voice.approach

  return `${audienceText} ${ticketNumber}, ${actionText} ${getRussianPlaceTarget(room)}`
}

export function CallBoard({
  labels = getLocale().board,
  recentCallsLimit = 10,
  rooms,
  showRecentCalls = true,
  showTime = true,
  template = 'classic',
  tickets,
  voiceEnabled = true,
}: CallBoardProps) {
  const [highlightedCallKey, setHighlightedCallKey] = useState('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const hasRenderedRef = useRef(false)
  const previousCallKeyRef = useRef('')

  const currentCalls = useMemo(
    () => tickets
      .filter(isBoardCallTicket)
      .sort((left, right) => getCallTimestamp(right) - getCallTimestamp(left)),
    [tickets],
  )
  const currentCall = currentCalls[0]
  const currentCallKey = getCallKey(currentCall)
  const currentCallRoom = currentCall ? getTicketRoom(currentCall, rooms) : undefined
  const currentCallRoomName = currentCall ? formatRoomName(currentCallRoom) : ''

  const recentCalls = tickets
    .filter(isBoardCallTicket)
    .sort((left, right) => getCallTimestamp(right) - getCallTimestamp(left))
    .slice(0, recentCallsLimit)
  const visibleCalls = showRecentCalls ? recentCalls : currentCall ? [currentCall] : []

  async function playBeep() {
    const AudioContextConstructor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!AudioContextConstructor) {
      return
    }

    const audioContext = audioContextRef.current ?? new AudioContextConstructor()
    audioContextRef.current = audioContext

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.32)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.34)
  }

  async function announceCall(ticket: Ticket, room?: Room | {
    id?: string
    name?: string
    number?: string | number
    placeType?: string
  }) {
    if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      window.speechSynthesis.cancel()
      const language = ticket.language ?? getCurrentLanguage() ?? 'ru'
      const utterance = new SpeechSynthesisUtterance(buildVoicePhrase(ticket.number, room, language))
      utterance.lang = getSpeechLanguage(language)
      utterance.rate = 0.92
      window.speechSynthesis.speak(utterance)
      return
    }

    await playBeep()
  }

  useEffect(() => {
    if (!currentCallKey) {
      previousCallKeyRef.current = ''
      hasRenderedRef.current = true
      return
    }

    const previousCallKey = previousCallKeyRef.current
    const shouldHighlight = hasRenderedRef.current && previousCallKey !== currentCallKey

    previousCallKeyRef.current = currentCallKey
    hasRenderedRef.current = true

    if (!shouldHighlight) {
      return
    }

    setHighlightedCallKey(currentCallKey)
    const highlightTimeout = window.setTimeout(() => setHighlightedCallKey(''), 2_000)

    if (voiceEnabled && currentCall) {
      void announceCall(currentCall, currentCallRoom).catch(() => undefined)
    }

    return () => window.clearTimeout(highlightTimeout)
  }, [currentCall, currentCallKey, currentCallRoom, voiceEnabled])

  if (template === 'minimal') {
    return (
      <div className="tv-layout tv-layout-minimal">
        {currentCall ? (
          <article
            className={`tv-call-card tv-call-featured ${highlightedCallKey === currentCallKey ? 'tv-call-animated' : ''}`}
          >
            <strong>{currentCall.number}</strong>
            <span>{currentCallRoomName}</span>
            {showTime ? <time>{formatTime(getCallTime(currentCall))}</time> : null}
          </article>
        ) : (
          <div className="tv-empty-call">{labels.waiting}</div>
        )}
      </div>
    )
  }

  if (template === 'grid') {
    return (
      <div className="tv-layout tv-layout-grid">
        {visibleCalls.length > 0 ? visibleCalls.map((ticket) => (
          <article
            className={`tv-call-card ${highlightedCallKey === getCallKey(ticket) ? 'tv-call-animated' : ''}`}
            key={ticket.id}
          >
            <strong>{ticket.number}</strong>
            <span>{getRoomName(ticket, rooms)}</span>
            {showTime ? <time>{formatTime(getCallTime(ticket))}</time> : null}
          </article>
        )) : (
          <div className="tv-empty-call">{labels.waiting}</div>
        )}
      </div>
    )
  }

  if (template === 'list') {
    return (
      <section className="tv-layout tv-layout-list">
        {visibleCalls.length > 0 ? visibleCalls.map((ticket) => (
          <div className="tv-list-row" key={ticket.id}>
            {showTime ? <time>{formatTime(getCallTime(ticket))}</time> : null}
            <strong>{ticket.number}</strong>
            <span>{getRoomName(ticket, rooms)}</span>
            {ticket.status === 'no_show' ? <em>{labels.noShow}</em> : null}
          </div>
        )) : (
          <div className="tv-empty-recent">{labels.waiting}</div>
        )}
      </section>
    )
  }

  return (
    <div className={`tv-grid ${showRecentCalls ? '' : 'tv-grid-single'}`}>
      <section className="tv-current">
        <span className="tv-section-label">{labels.currentCall}</span>
        {currentCall ? (
          <>
            <article
              className={`tv-call-card tv-call-featured ${highlightedCallKey === currentCallKey ? 'tv-call-animated' : ''}`}
            >
              <strong>{currentCall.number}</strong>
              <span>{currentCallRoomName}</span>
              {showTime ? <time>{formatTime(getCallTime(currentCall))}</time> : null}
            </article>
            {showRecentCalls && currentCalls.length > 1 ? (
              <div className="tv-current-list">
                {currentCalls.slice(1, Math.min(recentCallsLimit, 6)).map((ticket) => (
                  <div className="tv-recent-row" key={ticket.id}>
                    <strong>{ticket.number}</strong>
                    <span>{getRoomName(ticket, rooms)}</span>
                    {showTime ? <time>{formatTime(getCallTime(ticket))}</time> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="tv-empty-call">{labels.waiting}</div>
        )}
      </section>

      {showRecentCalls ? (
        <section className="tv-recent">
          <span className="tv-section-label">{labels.recentCalls}</span>
          {recentCalls.length > 0 ? (
            recentCalls.map((ticket) => (
              <div className="tv-recent-row" key={ticket.id}>
                <strong>{ticket.number}</strong>
                <span>{getRoomName(ticket, rooms)}</span>
                {showTime ? <time>{formatTime(getCallTime(ticket))}</time> : null}
                {ticket.status === 'no_show' ? <em>{labels.noShow}</em> : null}
              </div>
            ))
          ) : (
            <div className="tv-empty-recent">{labels.waiting}</div>
          )}
        </section>
      ) : null}
    </div>
  )
}
