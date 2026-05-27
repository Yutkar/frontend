import { useEffect, useState } from 'react'
import { CallBoard } from '@features/tv-board/CallBoard'
import { useQueueBootstrap } from '@features/queue/useQueueBootstrap'
import { t } from '@shared/locales/useLocale'
import { useQueueStore } from '@store/queue'

export function TvBoardPage() {
  useQueueBootstrap()

  const [now, setNow] = useState(new Date())
  const rooms = useQueueStore((state) => state.rooms)
  const tickets = useQueueStore((state) => state.tickets)

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000)

    return () => window.clearInterval(timerId)
  }, [])

  return (
    <main className="tv-board">
      <header className="tv-header">
        <div>
          <span>{t.system.smartq}</span>
          <strong>{t.queue.patientCallBoard}</strong>
        </div>
        <time>
          {new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(now)}
        </time>
      </header>
      <CallBoard rooms={rooms} tickets={tickets} />
    </main>
  )
}
