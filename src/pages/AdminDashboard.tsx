import { useEffect, useState } from 'react'
import { Building2, Stethoscope, UsersRound } from 'lucide-react'
import { adminService, type AdminRoom, type StaffMember } from '@services/adminService'

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  doctor: 'Врач',
  manager: 'Менеджер',
  nurse: 'Медсестра',
  specialist: 'Специалист',
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось загрузить данные администрирования.'
}

export function AdminDashboard() {
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])

  useEffect(() => {
    let active = true

    async function loadAdminData() {
      setLoading(true)
      setError(undefined)

      try {
        const [roomsData, staffData] = await Promise.all([
          adminService.getRooms(),
          adminService.getStaff(),
        ])

        if (active) {
          setRooms(roomsData)
          setStaff(staffData)
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadAdminData()

    return () => {
      active = false
    }
  }, [])

  const doctors = staff.filter((member) =>
    ['doctor', 'specialist'].includes(member.role),
  ).length
  const nurses = staff.filter((member) => member.role === 'nurse').length

  return (
    <div className="page-stack admin-page">
      <section className="primary-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Администрирование</span>
            <h2>Панель администратора</h2>
          </div>
        </div>

        {error ? <div className="architecture-resource-banner architecture-resource-error">{error}</div> : null}
        {loading ? <div className="architecture-resource-banner">Загрузка...</div> : null}

        <div className="admin-kpi-grid">
          <article>
            <Building2 size={22} />
            <span>Кабинеты</span>
            <strong>{rooms.length}</strong>
          </article>
          <article>
            <Stethoscope size={22} />
            <span>Врачи</span>
            <strong>{doctors}</strong>
          </article>
          <article>
            <UsersRound size={22} />
            <span>Медсёстры</span>
            <strong>{nurses}</strong>
          </article>
        </div>
      </section>

      <section className="primary-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Персонал</span>
            <h2>Текущие назначения</h2>
          </div>
        </div>
        <div className="admin-table-shell">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Роль</th>
                <th>Кабинет</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={3}>Нет данных</td>
                </tr>
              ) : null}
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{roleLabels[member.role] ?? member.role}</td>
                  <td>{rooms.find((room) => room.id === member.roomId)?.name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
