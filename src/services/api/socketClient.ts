import type { QueueEvent } from '@shared/types'

type QueueEventListener = (event: QueueEvent) => void

class SmartQSocketClient {
  private connected = false
  private listeners = new Set<QueueEventListener>()

  connect(): void {
    this.connected = true
  }

  disconnect(): void {
    this.connected = false
    this.listeners.clear()
  }

  isConnected(): boolean {
    return this.connected
  }

  subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  emitEvent(event: QueueEvent): void {
    if (!this.connected) {
      return
    }

    this.listeners.forEach((listener) => listener(event))
  }
}

export const socketClient = new SmartQSocketClient()
