import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CallBoard } from '@features/tv-board/CallBoard'
import { t } from '@shared/locales/useLocale'
import { publicApiClient } from '@services/api/client'
import type { Room, Ticket } from '@shared/types'

export function TvBoardPage() {
  const [searchParams] = useSearchParams()
  const roomIdParam = searchParams.get('roomId')
  const roomNamesParam = searchParams.get('rooms')
  const roomNameParam = searchParams.get('room')

  const [error, setError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [boardTitle, setBoardTitle] = useState<string>('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const clockInterval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(clockInterval)
  }, [])

  useEffect(() => {
    let active = true
    let requestId = 0

    const load = async () => {
      const currentRequestId = requestId + 1
      requestId = currentRequestId

      try {
        const roomsResponse = await publicApiClient.get('/rooms')
        const allRooms = roomsResponse.data as Array<{ id: number; name: string; isActive: boolean }>

        let resolvedRoomIds: string[] = []

        if (roomNamesParam) {
          const names = roomNamesParam.split(',').map((n) => n.trim())
          resolvedRoomIds = names
            .map((name) => {
              const found = allRooms.find((r) => r.name.toLowerCase() === name.toLowerCase())
              return found ? String(found.id) : null
            })
            .filter(Boolean) as string[]
        } else if (roomNameParam) {
          const found = allRooms.find((r) => r.name.toLowerCase() === roomNameParam.toLowerCase())
          if (found) resolvedRoomIds = [String(found.id)]
        } else if (roomIdParam) {
          resolvedRoomIds = [roomIdParam]
        }

        const allTickets: Ticket[] = []
        const uniqueRooms = new Map<string, Room>()

        if (resolvedRoomIds.length > 0) {
          const responses = await Promise.all(
            resolvedRoomIds.map((id) => publicApiClient.get(`/queue/board/${id}`))
          )

          responses.forEach((response) => {
            const data = response.data as any[]
            data.forEach((item) => {
              allTickets.push({
                id: String(item.id),
                number: item.number ?? `Талон ${item.id}`,
                status: item.status ?? 'waiting',
                priority: item.priority ?? 2,
                serviceType: item.serviceType?.name ?? 'consultation',
                createdAt: item.createdAt ?? new Date().toISOString(),
                calledAt: item.calledAt ?? undefined,
                updatedAt: item.updatedAt ?? undefined,
                startedAt: item.serviceStartedAt ?? undefined,
                completedAt: item.completedAt ?? undefined,
                roomId: item.roomId ? String(item.roomId) : undefined,
                roomName: item.room?.name ?? undefined,
                etaMinutes: item.etaMinutes ?? 0,
                patientName: `Пациент ${item.number ?? item.id}`,
              } as Ticket)
              if (item.room) {
                uniqueRooms.set(String(item.room.id), {
                  id: String(item.room.id),
                  name: item.room.name,
                  serviceTypes: [],
                } as unknown as Room)
              }
            })
          })

          const roomNames = Array.from(uniqueRooms.values()).map((r) => r.name)
          setBoardTitle(roomNames.join(', '))
        } else {
          const response = await publicApiClient.get('/queue/board')
          const data = response.data as any[]
          data.forEach((item) => {
            allTickets.push({
              id: String(item.id),
              number: item.number ?? `Талон ${item.id}`,
              status: item.status ?? 'waiting',
              priority: item.priority ?? 2,
              serviceType: item.serviceType?.name ?? 'consultation',
              createdAt: item.createdAt ?? new Date().toISOString(),
              calledAt: item.calledAt ?? undefined,
              updatedAt: item.updatedAt ?? undefined,
              startedAt: item.serviceStartedAt ?? undefined,
              completedAt: item.completedAt ?? undefined,
              roomId: item.roomId ? String(item.roomId) : undefined,
              roomName: item.room?.name ?? undefined,
              etaMinutes: item.etaMinutes ?? 0,
              patientName: `Пациент ${item.number ?? item.id}`,
            } as Ticket)
            if (item.room) {
              uniqueRooms.set(String(item.room.id), {
                id: String(item.room.id),
                name: item.room.name,
                serviceTypes: [],
              } as unknown as Room)
            }
          })
          setBoardTitle('')
        }

        if (!active || currentRequestId !== requestId) return

        setTickets(allTickets)
        setRooms(Array.from(uniqueRooms.values()))
        setError(null)
      } catch (err) {
        console.error('Board load failed', err)
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
  }, [roomIdParam, roomNameParam, roomNamesParam])

  return (
    <main className="tv-board">
      <header className="tv-header">
        <div>
          <span>{t.system.smartq}</span>
          <strong>{boardTitle ? `Табло — ${boardTitle}` : 'Общее табло'}</strong>
        </div>
        <time>
          {new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(now)}
        </time>
      </header>
      {error ? (
        <section className="empty-state">
          <h2>{error}</h2>
        </section>
      ) : null}
      <CallBoard rooms={rooms} tickets={tickets} />
    </main>
  )
}