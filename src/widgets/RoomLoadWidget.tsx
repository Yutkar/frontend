import type { Room, Ticket } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { formatWaitingTime, getAverageWaitingMinutes } from '@shared/utils'

type RoomLoadWidgetProps = {
  now?: number
  rooms: Room[]
  tickets?: Ticket[]
}

const activeTicketStatuses = ['created', 'waiting', 'called', 'in_service', 'redirected']

function getRoomStatusLabel(room: Room) {
  if (room.isActive === false || room.status === 'paused') {
    return 'Закрыт'
  }

  return room.status === 'busy' ? 'Занят' : 'Активен'
}

export function RoomLoadWidget({ now, rooms, tickets = [] }: RoomLoadWidgetProps) {
  const activeRooms = rooms.filter((room) => room.status !== 'paused' && room.isActive !== false)

  return (
    <section className="widget-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{t.analytics.rooms}</span>
          <h2>{t.analytics.loadPerRoom}</h2>
        </div>
      </div>
      {activeRooms.length > 0 ? (
        <div className="room-list">
          {activeRooms.map((room) => {
            const workload = room.workload ?? room.loadPercent
            const roomTickets = tickets.filter(
              (ticket) =>
                ticket.roomId === room.id &&
                activeTicketStatuses.includes(ticket.status),
            )
            const ticketsCount = roomTickets.length
            const averageWaitingMinutes = getAverageWaitingMinutes(roomTickets, now)

            return (
              <article className="room-row" key={room.id}>
                <div>
                  <strong>{room.name}</strong>
                  <span>{room.department}</span>
                </div>
                <div className="load-track">
                  <i style={{ width: `${workload}%` }} />
                </div>
                <div className="room-row-meta">
                  <b>{workload}%</b>
                  <span>{ticketsCount} тал.</span>
                  <span>
                    {averageWaitingMinutes === null
                      ? 'Нет очереди'
                      : `ср. ${formatWaitingTime(averageWaitingMinutes)}`}
                  </span>
                  <em>{getRoomStatusLabel(room)}</em>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-inline">
          <strong>Активные кабинеты не найдены</strong>
          <span>Создайте или активируйте кабинет в разделе администрирования.</span>
        </div>
      )}
    </section>
  )
}
