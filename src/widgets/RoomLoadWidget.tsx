import type { Room } from '@shared/types'
import { t } from '@shared/locales/useLocale'

type RoomLoadWidgetProps = {
  rooms: Room[]
}

export function RoomLoadWidget({ rooms }: RoomLoadWidgetProps) {
  return (
    <section className="widget-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t.analytics.rooms}</span>
          <h2>{t.analytics.loadPerRoom}</h2>
        </div>
      </div>
      <div className="room-list">
        {rooms.map((room) => {
          const workload = room.workload ?? room.loadPercent

          return (
            <article className="room-row" key={room.id}>
              <div>
                <strong>{room.name}</strong>
                <span>{room.department}</span>
              </div>
              <div className="load-track">
                <i style={{ width: `${workload}%` }} />
              </div>
              <b>{workload}%</b>
            </article>
          )
        })}
      </div>
    </section>
  )
}
