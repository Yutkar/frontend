import { io, type Socket } from 'socket.io-client'
import type { QueueEvent, QueueEventType } from '@shared/types'
import { API_BASE_URL, isBackendMode } from './apiProvider'

type QueueEventListener = (event: QueueEvent) => void
type RealtimeEventType = Extract<QueueEventType, 'status_update' | 'ticket_called'>

const realtimeEventTypes: RealtimeEventType[] = ['status_update', 'ticket_called']
const statusLabels: Record<string, string> = {
  called: 'Вызван',
  cancelled: 'Отменён',
  completed: 'Завершён',
  created: 'Создан',
  in_service: 'На обслуживании',
  no_show: 'Не явился',
  redirected: 'Перенаправлен',
  waiting: 'Ожидание',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getRecord(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const child = value[key]

  return isRecord(child) ? child : undefined
}

function getValue(value: unknown, keys: string[]): unknown {
  if (!isRecord(value)) {
    return undefined
  }

  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null) {
      return value[key]
    }
  }

  return undefined
}

function getNestedValue(value: unknown, directKeys: string[], nestedKey: string, nestedKeys: string[]): unknown {
  return getValue(value, directKeys) ?? getValue(getRecord(value, nestedKey), nestedKeys)
}

function toText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return undefined
}

function toId(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return undefined
}

function normalizeStatus(value: unknown): string | undefined {
  return toText(value)?.toLowerCase().replace(/-/g, '_')
}

function formatRoomName(roomName?: string, roomId?: string | number): string {
  const rawRoomName = roomName?.trim()

  if (rawRoomName) {
    return /кабинет/i.test(rawRoomName)
      ? rawRoomName
      : /^\d+$/.test(rawRoomName)
        ? `Кабинет ${rawRoomName}`
        : rawRoomName
  }

  return roomId !== undefined ? `Кабинет ${roomId}` : 'кабинет не указан'
}

function getCreatedAt(payload: unknown): string {
  const rawDate = toText(getValue(payload, [
    'createdAt',
    'created_at',
    'occurredAt',
    'occurred_at',
    'timestamp',
    'updatedAt',
    'updated_at',
  ]))
  const date = rawDate ? new Date(rawDate) : new Date()

  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString()
}

function buildMessage(
  type: RealtimeEventType,
  ticketNumber?: string,
  roomName?: string,
  roomId?: string | number,
  status?: string,
): string {
  const ticketLabel = ticketNumber ? `Талон ${ticketNumber}` : 'Талон'

  if (type === 'ticket_called') {
    return `${ticketLabel} вызван в ${formatRoomName(roomName, roomId).replace(/^Кабинет/i, 'кабинет')}`
  }

  const statusLabel = status ? statusLabels[status] ?? status : 'обновлён'

  return `${ticketLabel} переведён в статус «${statusLabel}»`
}

function createEventId(
  type: RealtimeEventType,
  payload: unknown,
  ticketId?: string | number,
  ticketNumber?: string,
  roomId?: string | number,
  status?: string,
  createdAt?: string,
): string {
  const rawId = toId(getValue(payload, ['id', '_id', 'eventId', 'event_id']))

  if (rawId !== undefined) {
    return String(rawId)
  }

  return [
    type,
    ticketId ?? ticketNumber ?? 'ticket',
    roomId ?? 'room',
    status ?? 'status',
    createdAt ?? JSON.stringify(payload),
  ].join(':')
}

function normalizeQueueEvent(type: RealtimeEventType, payload: unknown): QueueEvent {
  const ticket = getRecord(payload, 'ticket')
  const room = getRecord(payload, 'room')
  const ticketId = toId(getNestedValue(payload, ['ticketId', 'ticket_id'], 'ticket', ['id', '_id']))
  const ticketNumber = toText(
    getNestedValue(payload, ['ticketNumber', 'ticket_number', 'number'], 'ticket', ['number', 'ticketNumber']),
  )
  const roomId = toId(getNestedValue(payload, ['roomId', 'room_id'], 'room', ['id', '_id', 'roomId']))
  const roomName = toText(
    getValue(payload, ['roomName', 'room_name'])
      ?? getValue(room, ['name', 'roomName', 'room_name', 'title'])
      ?? getValue(ticket, ['roomName', 'room_name']),
  )
  const status = normalizeStatus(
    getValue(payload, ['status', 'newStatus', 'new_status'])
      ?? getValue(ticket, ['status']),
  )
  const createdAt = getCreatedAt(payload)
  const message = toText(getValue(payload, ['message', 'text', 'description']))
    ?? buildMessage(type, ticketNumber, roomName, roomId, status)

  return {
    createdAt,
    id: createEventId(type, payload, ticketId, ticketNumber, roomId, status, createdAt),
    message,
    occurredAt: createdAt,
    roomId,
    roomName,
    status,
    ticketId,
    ticketNumber,
    type,
  }
}

class SmartQSocketClient {
  private listeners = new Set<QueueEventListener>()
  private socket: Socket | null = null

  connect(): void {
    if (!isBackendMode) {
      return
    }

    if (!this.socket) {
      this.socket = io(API_BASE_URL, {
        auth: () => ({
          token: window.localStorage.getItem('access_token') ?? undefined,
        }),
        autoConnect: false,
        transports: ['websocket', 'polling'],
      })

      realtimeEventTypes.forEach((eventType) => {
        this.socket?.on(eventType, (payload: unknown) => {
          this.emitEvent(normalizeQueueEvent(eventType, payload))
        })
      })

      this.socket.on('connect_error', (error) => {
        if (import.meta.env.DEV) {
          console.warn('Socket подключение не удалось', error)
        }
      })
    }

    if (!this.socket.connected) {
      this.socket.connect()
    }
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.listeners.clear()
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected)
  }

  subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  emitEvent(event: QueueEvent): void {
    this.listeners.forEach((listener) => listener(event))
  }
}

export const socketClient = new SmartQSocketClient()
