import { useEffect, useState, type FormEvent } from 'react'
import { Link2 } from 'lucide-react'
import { adminService } from '@services/adminService'
import type { User } from '@shared/types'
import { Button } from '@shared/ui/components'
import {
  getAdminErrorMessage,
  getRoomName,
  getUserRoomId,
  type AdminRoomRecord,
} from './adminPageHelpers'

export function AdminDoctorRoomsPage() {
  const [doctorId, setDoctorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<AdminRoomRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<User[]>([])
  const [roomId, setRoomId] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [nextStaff, nextRooms] = await Promise.all([
        adminService.getStaff(),
        adminService.getRooms(),
      ])

      setStaff(nextStaff)
      setRooms(nextRooms as AdminRoomRecord[])
      setDoctorId((current) => current || nextStaff[0]?.id || '')
      setRoomId((current) => current || String(nextRooms[0]?.id ?? ''))
    } catch (loadError) {
      console.error('Doctor room bindings load failed', loadError)
      setError(getAdminErrorMessage(loadError, 'Не удалось загрузить привязки врачей'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!doctorId || !roomId) {
      setError('Выберите врача и кабинет.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await adminService.assignDoctorToRoom(doctorId, roomId)
      setSuccessMessage('Врач привязан к кабинету')
      await loadData()
    } catch (saveError) {
      console.error('Doctor room binding save failed', saveError)
      setError(getAdminErrorMessage(saveError, 'Не удалось сохранить привязку'))
    } finally {
      setSaving(false)
    }
  }

  function getRoomLabel(id?: string) {
    return getRoomName(rooms.find((room) => String(room.id) === id))
  }

  return (
    <div className="page-stack">
      <section className="admin-page-grid">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                <Link2 size={14} />
                Администрирование
              </span>
              <h2>Привязка врачей к кабинетам</h2>
            </div>
          </div>

          {error ? <div className="modal-error">{error}</div> : null}
          {successMessage ? <div className="modal-success">{successMessage}</div> : null}

          <form className="admin-inline-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Врач</span>
              <select
                disabled={loading || saving}
                onChange={(event) => setDoctorId(event.target.value)}
                value={doctorId}
              >
                <option value="">Выберите врача</option>
                {staff.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Кабинет</span>
              <select
                disabled={loading || saving}
                onChange={(event) => setRoomId(event.target.value)}
                value={roomId}
              >
                <option value="">Выберите кабинет</option>
                {rooms.map((room) => (
                  <option key={String(room.id)} value={String(room.id)}>
                    {getRoomName(room)}
                  </option>
                ))}
              </select>
            </label>

            <Button disabled={loading || saving || !doctorId || !roomId} type="submit" variant="primary">
              Назначить
            </Button>
          </form>
        </div>

        <aside className="widget-panel admin-form-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Кабинеты</span>
              <h2>Текущие привязки</h2>
            </div>
          </div>

          {loading ? (
            <div className="empty-state compact-empty">
              <h2>Загружаем привязки</h2>
            </div>
          ) : staff.length > 0 ? (
            <div className="admin-binding-list">
              {staff.map((doctor) => (
                <article key={doctor.id}>
                  <strong>{doctor.name}</strong>
                  <span>{getRoomLabel(getUserRoomId(doctor))}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <h2>Врачи не найдены</h2>
              <p>Добавьте врача во вкладке «Персонал».</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
