import { useEffect, useMemo, useRef, useState } from 'react'
import { voiceSettingsService } from '@services/voiceSettingsService'
import type { BoardTemplate } from '@services/api'
import {
  buildKazakhCallAudioSequence,
  playAudioSequence,
} from './kazakhAudio'
import {
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
  currentTime?: string
  recentCallsLimit?: number
  rooms: Room[]
  showRecentCalls?: boolean
  showTime?: boolean
  template?: BoardTemplate
  tickets: Ticket[]
  voiceEnabled?: boolean
  dataReady?: boolean
}

type BoardMultilingualLabelKey = 'currentCall' | 'recentCalls' | 'waiting'

type TicketRoom = Room | {
  id?: string
  name?: string
  number?: string | number
  placeType?: string
}

type PendingAnnouncement = {
  key: string
  room?: TicketRoom
  ticket: Ticket
}

function BoardMultilingualLabel({ labelKey }: { labelKey: BoardMultilingualLabelKey }) {
  return (
    <span className="tv-multilingual-label">
      <span>{getLocale('ru').board[labelKey]}</span>
      <span>{getLocale('kk').board[labelKey]}</span>
      <span>{getLocale('en').board[labelKey]}</span>
    </span>
  )
}

function getCallTime(ticket: Ticket): string {
  return ticket.calledAt ?? ticket.updatedAt ?? ticket.createdAt
}

function getCallTimestamp(ticket: Ticket): number {
  const timestamp = Date.parse(getCallTime(ticket))
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getTicketRoom(ticket: Ticket, rooms: Room[]): TicketRoom {
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
  if (!ticket) return ''

  return `${ticket.id}:${ticket.calledAt ?? ticket.status}`
}

function getCallAnnouncementKey(ticket?: Ticket): string {
  if (!ticket?.calledAt) return ''

  return `${ticket.id || ticket.number}_${ticket.calledAt}`
}

function isBoardCallTicket(ticket: Ticket): boolean {
  return Boolean(ticket.calledAt) || ticket.status === 'called' || ticket.status === 'in_service'
}

function getSpeechLanguage(language: SmartQLanguage): string {
  if (language === 'en') return 'en-US'

  return 'ru-RU'
}

function findSpeechVoice(language: SmartQLanguage, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const speechLanguage = getSpeechLanguage(language).toLowerCase()
  const speechLanguagePrefix = speechLanguage.split('-')[0]

  return voices.find((voice) => voice.lang.toLowerCase() === speechLanguage)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(speechLanguagePrefix))
}

function waitForSpeechVoices(timeoutMs = 800): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([])
  }

  const voices = window.speechSynthesis.getVoices()

  if (voices.length > 0) {
    return Promise.resolve(voices)
  }

  return new Promise((resolve) => {
    let timeoutId = 0

    const cleanup = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      window.clearTimeout(timeoutId)
    }

    const handleVoicesChanged = () => {
      cleanup()
      resolve(window.speechSynthesis.getVoices())
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
    timeoutId = window.setTimeout(() => {
      cleanup()
      resolve(window.speechSynthesis.getVoices())
    }, timeoutMs)
  })
}

function getEnglishPlaceType(room?: TicketRoom): string {
  const placeType = getRoomPlaceType(room)

  if (placeType === 'window') return 'window'
  if (placeType === 'desk') return 'desk'

  return 'room'
}

function getRussianPlaceTarget(room?: TicketRoom): string {
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
  room: TicketRoom | undefined,
  language: SmartQLanguage,
): string {
  const voiceSettings = voiceSettingsService.getSettings()
  const audience = voiceSettings.audience
  const roomNumber = getRoomPlaceNumber(room) || (room?.id ? String(room.id) : '')

  if (language === 'en') {
    const audienceText = audience === 'client' ? 'Client' : 'Patient'

    return `${audienceText} ${ticketNumber}, please proceed to ${getEnglishPlaceType(room)} ${roomNumber}`
  }

  const locale = getLocale('ru')
  const audienceText = audience === 'client' ? locale.voice.client : locale.voice.patient
  const actionText = voiceSettings.action === 'enter' ? locale.voice.enter : locale.voice.approach

  return `${audienceText} ${ticketNumber}, ${actionText} ${getRussianPlaceTarget(room)}`
}

function RecentCallsPanel({
  highlightedCallKey,
  labels,
  recentCalls,
  rooms,
  showTime,
}: {
  highlightedCallKey?: string
  labels: NonNullable<CallBoardProps['labels']>
  recentCalls: Ticket[]
  rooms: Room[]
  showTime: boolean
}) {
  return (
    <section className="tv-recent tv-recent-embedded">
      <span className="tv-section-label">
        <BoardMultilingualLabel labelKey="recentCalls" />
      </span>
      {recentCalls.length > 0 ? (
        recentCalls.map((ticket) => (
          <div
            className={`tv-recent-row ${highlightedCallKey === getCallKey(ticket) ? 'tv-call-animated' : ''}`}
            key={ticket.id}
          >
            <strong>{ticket.number}</strong>
            <span>{getRoomName(ticket, rooms)}</span>
            {showTime ? <time>{formatTime(getCallTime(ticket))}</time> : null}
            {ticket.status === 'no_show' ? <em>{labels.noShow}</em> : null}
          </div>
        ))
      ) : (
        <div className="tv-empty-recent">
          <BoardMultilingualLabel labelKey="waiting" />
        </div>
      )}
    </section>
  )
}

export function CallBoard({
  currentTime,
  labels = getLocale().board,
  recentCallsLimit = 10,
  rooms,
  showRecentCalls = true,
  showTime = true,
  template = 'classic',
  tickets,
  voiceEnabled = true,
  dataReady = true,
}: CallBoardProps) {
  const [highlightedCallKey, setHighlightedCallKey] = useState('')
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeAnnouncementKeyRef = useRef('')
  const knownCallKeysRef = useRef<Set<string>>(new Set())
  const announcementQueueRef = useRef<PendingAnnouncement[]>([])
  const highlightTimeoutRef = useRef<number | null>(null)
  const isAnnouncementPlayingRef = useRef(false)
  const speechKeepAliveIntervalRef = useRef<number | null>(null)
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const hasRenderedRef = useRef(false)

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
  const historyCalls = currentCall
    ? tickets
      .filter((ticket) => isBoardCallTicket(ticket) && getCallKey(ticket) !== currentCallKey)
      .sort((left, right) => getCallTimestamp(right) - getCallTimestamp(left))
      .slice(0, recentCallsLimit)
    : recentCalls
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

  function stopSpeechKeepAlive() {
    if (speechKeepAliveIntervalRef.current !== null) {
      window.clearInterval(speechKeepAliveIntervalRef.current)
      speechKeepAliveIntervalRef.current = null
    }
  }

  function startSpeechKeepAlive() {
    stopSpeechKeepAlive()
    speechKeepAliveIntervalRef.current = window.setInterval(() => {
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
    }, 1_000)
  }

  function clearHighlightTimeout() {
    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current)
      highlightTimeoutRef.current = null
    }
  }

  function highlightCall(ticket: Ticket) {
    clearHighlightTimeout()
    setHighlightedCallKey(getCallKey(ticket))
    highlightTimeoutRef.current = window.setTimeout(() => setHighlightedCallKey(''), 2_000)
  }

  function processNextAnnouncement() {
    if (isAnnouncementPlayingRef.current) {
      return
    }

    const nextAnnouncement = announcementQueueRef.current.shift()

    if (!nextAnnouncement) {
      return
    }

    isAnnouncementPlayingRef.current = true
    highlightCall(nextAnnouncement.ticket)
    void announceCall(
      nextAnnouncement.ticket,
      nextAnnouncement.room,
      nextAnnouncement.key,
    ).catch(() => {
      finishAnnouncement(nextAnnouncement.key)
    })
  }

  function enqueueAnnouncement(announcement: PendingAnnouncement) {
    const alreadyQueued = announcementQueueRef.current.some((item) => item.key === announcement.key)

    if (alreadyQueued || activeAnnouncementKeyRef.current === announcement.key) {
      return
    }

    announcementQueueRef.current.push(announcement)
    processNextAnnouncement()
  }

  function finishAnnouncement(announcementKey: string, utterance?: SpeechSynthesisUtterance) {
    if (activeAnnouncementKeyRef.current === announcementKey) {
      activeAnnouncementKeyRef.current = ''
    }
    if (!utterance || speechUtteranceRef.current === utterance) {
      speechUtteranceRef.current = null
    }
    isAnnouncementPlayingRef.current = false
    stopSpeechKeepAlive()
    processNextAnnouncement()
  }

  async function announceCall(ticket: Ticket, room?: TicketRoom, announcementKey = getCallAnnouncementKey(ticket)) {
    const language = ticket.language ?? 'ru'

    if (language === 'kk') {
      activeAnnouncementKeyRef.current = announcementKey
      const voiceSettings = voiceSettingsService.getSettings()
      const files = buildKazakhCallAudioSequence(ticket, room, voiceSettings)

      await playAudioSequence(files)
      finishAnnouncement(announcementKey)
      return
    }

    if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      if (activeAnnouncementKeyRef.current === announcementKey && window.speechSynthesis.speaking) {
        return
      }

      activeAnnouncementKeyRef.current = announcementKey

      const voices = await waitForSpeechVoices()

      if (activeAnnouncementKeyRef.current !== announcementKey) {
        return
      }

      const voice = findSpeechVoice(language, voices)
      const phrase = buildVoicePhrase(ticket.number, room, language)
      const utterance = new SpeechSynthesisUtterance(phrase)
      utterance.lang = getSpeechLanguage(language)
      utterance.voice = voice ?? null
      utterance.rate = 0.92
      utterance.onend = () => finishAnnouncement(announcementKey, utterance)
      utterance.onerror = () => finishAnnouncement(announcementKey, utterance)
      speechUtteranceRef.current = utterance
      startSpeechKeepAlive()
      window.speechSynthesis.speak(utterance)
      return
    }

    await playBeep()
    finishAnnouncement(announcementKey)
  }

  useEffect(() => () => {
    announcementQueueRef.current = []
    clearHighlightTimeout()
    stopSpeechKeepAlive()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    const callsWithCalledAt = currentCalls.filter((ticket) => Boolean(ticket.calledAt))

    if (!dataReady) {
      hasRenderedRef.current = false
      knownCallKeysRef.current = new Set()
      announcementQueueRef.current = []
      activeAnnouncementKeyRef.current = ''
      isAnnouncementPlayingRef.current = false
      clearHighlightTimeout()
      setHighlightedCallKey('')
      stopSpeechKeepAlive()
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      return
    }

    if (!hasRenderedRef.current) {
      callsWithCalledAt.forEach((ticket) => {
        const announcementKey = getCallAnnouncementKey(ticket)

        if (announcementKey) {
          knownCallKeysRef.current.add(announcementKey)
        }
      })
      hasRenderedRef.current = true
      return
    }

    if (!voiceEnabled || callsWithCalledAt.length === 0) {
      return
    }

    callsWithCalledAt
      .filter((ticket) => {
        const announcementKey = getCallAnnouncementKey(ticket)

        return Boolean(announcementKey && !knownCallKeysRef.current.has(announcementKey))
      })
      .sort((left, right) => getCallTimestamp(left) - getCallTimestamp(right))
      .forEach((ticket) => {
        const announcementKey = getCallAnnouncementKey(ticket)

        if (!announcementKey) {
          return
        }

        knownCallKeysRef.current.add(announcementKey)
        enqueueAnnouncement({
          key: announcementKey,
          room: getTicketRoom(ticket, rooms),
          ticket,
        })
      })
  }, [currentCalls, dataReady, rooms, voiceEnabled])

  if (template === 'minimal') {
    return (
      <div className={showRecentCalls ? 'tv-minimal-stack' : 'tv-layout tv-layout-minimal'}>
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
            <div className="tv-empty-call">
              <BoardMultilingualLabel labelKey="waiting" />
            </div>
          )}
        </div>
        {showRecentCalls ? (
            <RecentCallsPanel
              highlightedCallKey={highlightedCallKey}
              labels={labels}
              recentCalls={historyCalls}
              rooms={rooms}
              showTime={showTime}
            />
        ) : null}
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
          <div className="tv-empty-call">
            <BoardMultilingualLabel labelKey="waiting" />
          </div>
        )}
      </div>
    )
  }

  if (template === 'list') {
    return (
      <section className="tv-layout tv-layout-list">
        {visibleCalls.length > 0 ? visibleCalls.map((ticket) => (
          <div
            className={`tv-list-row ${highlightedCallKey === getCallKey(ticket) ? 'tv-call-animated' : ''}`}
            key={ticket.id}
          >
            <strong>{ticket.number}</strong>
            <span>{getRoomName(ticket, rooms)}</span>
            {showTime ? <time>{formatTime(getCallTime(ticket))}</time> : null}
            {ticket.status === 'no_show' ? <em>{labels.noShow}</em> : null}
          </div>
        )) : (
          <div className="tv-empty-recent">
            <BoardMultilingualLabel labelKey="waiting" />
          </div>
        )}
      </section>
    )
  }

  return (
    <div className={`tv-grid ${showRecentCalls ? '' : 'tv-grid-single'}`}>
      {showRecentCalls ? (
        <RecentCallsPanel
          highlightedCallKey={highlightedCallKey}
          labels={labels}
          recentCalls={historyCalls}
          rooms={rooms}
          showTime={showTime}
        />
      ) : null}

      <section className="tv-current">
        <div className="tv-section-heading">
          <span className="tv-section-label">
            <BoardMultilingualLabel labelKey="currentCall" />
          </span>
          {showTime && currentTime ? <time>{currentTime}</time> : null}
        </div>
        {currentCall ? (
          <>
            <article
              className={`tv-call-card tv-call-featured ${highlightedCallKey === currentCallKey ? 'tv-call-animated' : ''}`}
            >
              <strong>{currentCall.number}</strong>
              <span>{currentCallRoomName}</span>
              {showTime ? <time>{formatTime(getCallTime(currentCall))}</time> : null}
            </article>
          </>
        ) : (
          <div className="tv-empty-call">
            <BoardMultilingualLabel labelKey="waiting" />
          </div>
        )}
      </section>
    </div>
  )
}
