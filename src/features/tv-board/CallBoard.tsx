import { useEffect, useMemo, useRef, useState } from 'react'
import { voiceSettingsService } from '@services/voiceSettingsService'
import type { BoardPromoMedia } from '@services/boardPromoMediaService'
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
  getRoomPlaceNumber,
  getRoomPlaceType,
  getRoomPlaceTypeLabel,
} from '@shared/utils'

type CallBoardProps = {
  labels?: {
    currentCall: string
    noShow: string
    recentCalls: string
    waiting: string
  }
  promoMedia?: BoardPromoMedia
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
  mode: 'notification' | 'voice'
  room?: TicketRoom
  ticket: Ticket
}

const notificationAudioPath = '/audio/notification.mp3'

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

function getRoomDisplayNumber(room?: TicketRoom): string {
  return getRoomPlaceNumber(room) || (room?.id ? String(room.id) : '')
}

function getRoomDisplayValue(room?: TicketRoom): string {
  return getRoomDisplayNumber(room) || formatRoomName(room)
}

function getRoomPlaceLabel(room?: TicketRoom): string {
  return getRoomPlaceTypeLabel(getRoomPlaceType(room))
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

function getClassicHistoryDensityClass(rowCount: number): string {
  if (rowCount > 20) return 'tv-classic-history-ultra'
  if (rowCount > 12) return 'tv-classic-history-dense'
  if (rowCount > 7) return 'tv-classic-history-compact'

  return ''
}

function ClassicHistoryPanel({
  highlightedCallKey,
  historyLimit,
  recentCalls,
  rooms,
}: {
  highlightedCallKey?: string
  historyLimit: number
  recentCalls: Ticket[]
  rooms: Room[]
}) {
  return (
    <section className={`tv-recent tv-classic-history ${getClassicHistoryDensityClass(historyLimit)}`}>
      {recentCalls.length > 0 ? (
        <table>
          <tbody>
            {recentCalls.map((ticket) => (
              <tr
                className={highlightedCallKey === getCallKey(ticket) ? 'tv-call-animated' : ''}
                key={ticket.id}
              >
                <td>{ticket.number}</td>
                <td>{getRoomName(ticket, rooms)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="tv-empty-recent">
          <BoardMultilingualLabel labelKey="waiting" />
        </div>
      )}
    </section>
  )
}

function HistoryCallsTable({
  highlightedCallKey,
  labels,
  recentCalls,
  rooms,
}: {
  highlightedCallKey?: string
  labels: NonNullable<CallBoardProps['labels']>
  recentCalls: Ticket[]
  rooms: Room[]
}) {
  return (
    <table className="tv-call-history-table">
      <thead>
        <tr>
          <th>Талон</th>
          <th>Кабинет / Окно / Стол</th>
        </tr>
      </thead>
      <tbody>
        {recentCalls.length > 0 ? recentCalls.map((ticket) => {
          const room = getTicketRoom(ticket, rooms)

          return (
            <tr
              className={highlightedCallKey === getCallKey(ticket) ? 'tv-call-animated' : ''}
              key={ticket.id}
            >
              <td>{ticket.number}</td>
              <td>{getRoomDisplayValue(room)}</td>
            </tr>
          )
        }) : (
          <tr>
            <td colSpan={2}>{labels.waiting}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function PromoMediaPanel({ media }: { media?: BoardPromoMedia }) {
  const [failedVideoUrl, setFailedVideoUrl] = useState('')
  const [failedImageUrl, setFailedImageUrl] = useState('')
  const videoUrl = media?.videoUrl
  const imageUrl = media?.imageUrl

  if (videoUrl && failedVideoUrl !== videoUrl) {
    return (
      <section className="tv-promo-panel">
        <video
          autoPlay
          loop
          muted
          onError={() => setFailedVideoUrl(videoUrl)}
          onLoadedData={() => setFailedVideoUrl('')}
          playsInline
          src={videoUrl}
        />
      </section>
    )
  }

  if (videoUrl) {
    return (
      <section className="tv-promo-panel tv-promo-empty tv-promo-unavailable" role="status">
        <strong>Видео недоступно</strong>
      </section>
    )
  }

  if (imageUrl && failedImageUrl !== imageUrl) {
    return (
      <section className="tv-promo-panel">
        <img
          alt=""
          onError={() => setFailedImageUrl(imageUrl)}
          onLoad={() => setFailedImageUrl('')}
          src={imageUrl}
        />
      </section>
    )
  }

  return (
    <section className="tv-promo-panel tv-promo-empty" aria-hidden="true">
      <strong>SmartQ</strong>
    </section>
  )
}

export function CallBoard({
  labels = getLocale().board,
  promoMedia,
  recentCallsLimit = 10,
  rooms,
  showRecentCalls = true,
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
  const historyLimit = Math.min(30, Math.max(0, Math.trunc(recentCallsLimit)))
  const historyCalls = currentCall
    ? currentCalls
      .filter((ticket) => getCallKey(ticket) !== currentCallKey)
      .slice(0, historyLimit)
    : []
  const historyVisible = showRecentCalls && historyLimit > 0
  const visibleCalls = currentCall
    ? [currentCall, ...(historyVisible ? historyCalls : [])]
    : []

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

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 380)
    })
  }

  function playNotificationFile(): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio(notificationAudioPath)
      let settled = false

      const finish = (played: boolean) => {
        if (settled) return

        settled = true
        audio.onended = null
        audio.onerror = null
        audio.onabort = null
        resolve(played)
      }

      audio.preload = 'auto'
      audio.onended = () => finish(true)
      audio.onerror = () => finish(false)
      audio.onabort = () => finish(false)
      audio.play().catch(() => finish(false))
    })
  }

  async function playNotificationSound(): Promise<void> {
    const played = await playNotificationFile()

    if (!played) {
      await playBeep().catch(() => undefined)
    }
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
    const playAnnouncement = nextAnnouncement.mode === 'voice'
      ? announceCall(nextAnnouncement.ticket, nextAnnouncement.room, nextAnnouncement.key)
      : playNotificationAnnouncement(nextAnnouncement.key)

    void playAnnouncement.catch(() => {
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

  async function playNotificationAnnouncement(announcementKey: string) {
    activeAnnouncementKeyRef.current = announcementKey
    await playNotificationSound()
    finishAnnouncement(announcementKey)
  }

  async function announceCall(ticket: Ticket, room?: TicketRoom, announcementKey = getCallAnnouncementKey(ticket)) {
    const language = ticket.language ?? 'ru'

    activeAnnouncementKeyRef.current = announcementKey

    if (language === 'kk') {
      const voiceSettings = voiceSettingsService.getSettings()
      const files = buildKazakhCallAudioSequence(ticket, room, voiceSettings)

      await playAudioSequence(files)
      finishAnnouncement(announcementKey)
      return
    }

    if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
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

    if (callsWithCalledAt.length === 0) {
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
          mode: voiceEnabled ? 'voice' : 'notification',
          room: getTicketRoom(ticket, rooms),
          ticket,
        })
      })
  }, [currentCalls, dataReady, rooms, voiceEnabled])

  const currentCallPlaceValue = currentCall ? getRoomDisplayValue(currentCallRoom) : ''
  const currentCallPlaceLabel = currentCall ? getRoomPlaceLabel(currentCallRoom) : ''
  const currentCallHighlightClass = currentCall && highlightedCallKey === currentCallKey ? 'tv-call-animated' : ''
  const cardCalls = currentCall
    ? [
      currentCall,
      ...(historyVisible ? historyCalls : []),
    ]
    : visibleCalls

  if (template === 'video_queue') {
    return (
      <div className={`tv-video-layout ${historyVisible ? '' : 'tv-video-layout-no-history'}`}>
        <section
          className={`tv-video-current ${currentCallHighlightClass}`}
        >
          {currentCall ? (
            <>
              <div className="tv-route-call">
                <strong>{currentCall.number}</strong>
                <span aria-hidden="true">→</span>
                <strong>{currentCallPlaceValue}</strong>
              </div>
              <div className="tv-route-place-label">{currentCallPlaceLabel}</div>
            </>
          ) : (
            <div className="tv-empty-call">
              <BoardMultilingualLabel labelKey="waiting" />
            </div>
          )}
        </section>

        {historyVisible ? (
          <section className="tv-video-history">
            <span className="tv-video-section-title">Последние вызовы</span>
            <HistoryCallsTable
              highlightedCallKey={highlightedCallKey}
              labels={labels}
              recentCalls={historyCalls}
              rooms={rooms}
            />
          </section>
        ) : null}

        <PromoMediaPanel
          key={`${promoMedia?.videoUrl ?? ''}|${promoMedia?.imageUrl ?? ''}`}
          media={promoMedia}
        />
      </div>
    )
  }

  if (template === 'big_board') {
    return (
      <div className="tv-big-board">
        <section
          className={`tv-big-current ${currentCallHighlightClass}`}
        >
          {currentCall ? (
            <>
              <div className="tv-big-route">
                <strong>{currentCall.number}</strong>
                <span aria-hidden="true">→</span>
                <strong>{currentCallPlaceValue}</strong>
              </div>
              <div className="tv-big-place">{currentCallPlaceLabel}</div>
            </>
          ) : (
            <div className="tv-empty-call">
              <BoardMultilingualLabel labelKey="waiting" />
            </div>
          )}
        </section>

        {historyVisible ? (
          <section className="tv-big-history">
            <HistoryCallsTable
              highlightedCallKey={highlightedCallKey}
              labels={labels}
              recentCalls={historyCalls}
              rooms={rooms}
            />
          </section>
        ) : null}
      </div>
    )
  }

  if (template === 'minimal') {
    return (
      <div className="tv-layout tv-layout-minimal">
        {currentCall ? (
          <article
            className={`tv-call-card tv-call-featured ${highlightedCallKey === currentCallKey ? 'tv-call-animated' : ''}`}
          >
            <strong>{currentCall.number}</strong>
            <span>{currentCallRoomName}</span>
          </article>
        ) : (
          <div className="tv-empty-call">
            <BoardMultilingualLabel labelKey="waiting" />
          </div>
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
          </article>
        )) : (
          <div className="tv-empty-call">
            <BoardMultilingualLabel labelKey="waiting" />
          </div>
        )}
      </div>
    )
  }

  if (template === 'cards') {
    return (
      <div className="tv-layout tv-layout-cards">
        {cardCalls.length > 0 ? cardCalls.map((ticket, index) => (
          <article
            className={`tv-call-card ${index === 0 ? 'tv-call-featured' : ''} ${highlightedCallKey === getCallKey(ticket) ? 'tv-call-animated' : ''}`}
            key={ticket.id}
          >
            <strong>{ticket.number}</strong>
            <span>{getRoomName(ticket, rooms)}</span>
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
    <div className={`tv-grid ${historyVisible ? '' : 'tv-grid-single'}`}>
      {historyVisible ? (
        <ClassicHistoryPanel
          highlightedCallKey={highlightedCallKey}
          historyLimit={historyLimit}
          recentCalls={historyCalls}
          rooms={rooms}
        />
      ) : null}

      <section className="tv-current">
        <div className="tv-section-heading">
          <span className="tv-section-label">
            <BoardMultilingualLabel labelKey="currentCall" />
          </span>
        </div>
        {currentCall ? (
          <article
            className={`tv-call-card tv-call-featured ${highlightedCallKey === currentCallKey ? 'tv-call-animated' : ''}`}
          >
            <strong>{currentCall.number}</strong>
            <span>{currentCallRoomName}</span>
          </article>
        ) : (
          <div className="tv-empty-call">
            <BoardMultilingualLabel labelKey="waiting" />
          </div>
        )}
      </section>
    </div>
  )
}
