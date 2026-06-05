import { useEffect, useMemo, useRef, useState } from 'react'
import type { Room, Ticket } from '@shared/types'
import { formatRoomName, formatTime } from '@shared/utils'

type CallBoardProps = {
  rooms: Room[]
  tickets: Ticket[]
}

function getCallTime(ticket: Ticket): string {
  return ticket.calledAt ?? ticket.updatedAt ?? ticket.createdAt
}

function getCallTimestamp(ticket: Ticket): number {
  const timestamp = Date.parse(getCallTime(ticket))
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getRoomName(ticket: Ticket, rooms: Room[]): string {
  if (ticket.roomName) {
    return formatRoomName({ id: ticket.roomId, name: ticket.roomName })
  }
  const room = rooms.find((item) => String(item.id) === String(ticket.roomId))
  return formatRoomName(room ?? { id: ticket.roomId })
}

function getCallKey(ticket?: Ticket): string {
  return ticket ? `${ticket.id}:${getCallTime(ticket)}` : ''
}

function getSpeechRoomName(roomName: string): string {
  return roomName.replace(/^Кабинет/i, 'кабинет')
}

export function CallBoard({ rooms, tickets }: CallBoardProps) {
  const [highlightedCallKey, setHighlightedCallKey] = useState('')
  const [soundBlocked, setSoundBlocked] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const hasRenderedRef = useRef(false)
  const previousCallKeyRef = useRef('')

  const currentCall = useMemo(
    () => tickets
      .filter((ticket) => ticket.status === 'called')
      .sort((left, right) => getCallTimestamp(right) - getCallTimestamp(left))[0],
    [tickets],
  )
  const currentCallKey = getCallKey(currentCall)
  const currentCallNumber = currentCall?.number ?? ''
  const currentCallRoomName = currentCall ? getRoomName(currentCall, rooms) : ''

  const recentCalls = tickets
    .filter((ticket) =>
      ticket.calledAt &&
      (ticket.status === 'called' || ticket.status === 'no_show'),
    )
    .sort((left, right) => getCallTimestamp(right) - getCallTimestamp(left))
    .slice(0, 10)

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

  async function announceCall(ticketNumber: string, roomName: string) {
    if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(
        `Талон ${ticketNumber}, ${getSpeechRoomName(roomName)}`,
      )
      utterance.lang = 'ru-RU'
      utterance.rate = 0.92
      window.speechSynthesis.speak(utterance)
      return
    }

    await playBeep()
  }

  async function enableSound() {
    try {
      await playBeep()
      setSoundBlocked(false)
      setSoundEnabled(true)
    } catch (error) {
      console.error('Board sound enable failed', error)
      setSoundBlocked(true)
    }
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

    if (soundEnabled) {
      void announceCall(currentCallNumber, currentCallRoomName).catch((error) => {
        console.error('Board call announce failed', error)
        setSoundBlocked(true)
      })
    }

    return () => window.clearTimeout(highlightTimeout)
  }, [currentCallKey, currentCallNumber, currentCallRoomName, soundEnabled])

  return (
    <div className="tv-grid">
      <section className="tv-current">
        <span className="tv-section-label">Сейчас вызывается</span>
        {!soundEnabled || soundBlocked ? (
          <button className="tv-sound-button" onClick={() => void enableSound()} type="button">
            Включить звук
          </button>
        ) : null}
        {currentCall ? (
          <article
            className={`tv-call-card tv-call-featured ${highlightedCallKey === currentCallKey ? 'tv-call-animated' : ''}`}
          >
            <strong>{currentCall.number}</strong>
            <span>{currentCallRoomName}</span>
            <time>{formatTime(getCallTime(currentCall))}</time>
          </article>
        ) : (
          <div className="tv-empty-call">Ожидайте вызова</div>
        )}
      </section>

      <section className="tv-recent">
        <span className="tv-section-label">Последние вызовы</span>
        {recentCalls.length > 0 ? (
          recentCalls.map((ticket) => (
            <div className="tv-recent-row" key={ticket.id}>
              <strong>{ticket.number}</strong>
              <span>{getRoomName(ticket, rooms)}</span>
              <time>{formatTime(getCallTime(ticket))}</time>
              {ticket.status === 'no_show' ? <em>Не явился</em> : null}
            </div>
          ))
        ) : (
          <div className="tv-empty-recent">Ожидайте вызова</div>
        )}
      </section>
    </div>
  )
}
