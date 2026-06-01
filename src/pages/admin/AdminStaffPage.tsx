import { useEffect, useState, type FormEvent } from 'react'
import { PlusCircle, UsersRound } from 'lucide-react'
import { adminService } from '@services/adminService'
import type { User } from '@shared/types'
import { Button } from '@shared/ui/components'
import {
  getRoomName,
  getUserEmail,
  getUserRoomId,
  roleLabels,
  type AdminRoomRecord,
} from './adminPageHelpers'
import { useGlobalStore } from '@store/global'

type StaffFormState = {
  email: string
  name: string
  password: string
  role: 'specialist' | 'manager'
  roomId: string
}

const emptyForm: StaffFormState = {
  email: '',
  name: '',
  password: '',
  role: 'specialist',
  roomId: '',
}

export function AdminStaffPage() {
  const user = useGlobalStore((state) => state.user)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<StaffFormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<AdminRoomRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<User[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const canCreateManagers = user?.role === 'admin'

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
    } catch (loadError) {
      console.error('Admin staff load failed', loadError)
      setError('Не удалось загрузить персонал.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function resetForm() {
    setEditingUserId(null)
    setForm(emptyForm)
    setError(null)
  }

  function handleEdit(staffMember: User) {
    setEditingUserId(staffMember.id)
    setForm({
      email: staffMember.email ?? '',
      name: staffMember.name,
      password: '',
      role: staffMember.role === 'manager' ? 'manager' : 'specialist',
      roomId: getUserRoomId(staffMember),
    })
    setSuccessMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim() || !form.email.trim()) {
      setError('Введите имя и email.')
      return
    }

    if (!editingUserId && !form.password.trim()) {
      setError('Введите пароль для нового аккаунта.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      assignedRoomId: form.roomId || undefined,
      email: form.email.trim(),
      name: form.name.trim(),
      password: form.password.trim() || undefined,
      roomId: form.roomId || undefined,
    }

    try {
      if (editingUserId) {
        await adminService.updateStaff(editingUserId, payload)
      } else if (form.role === 'manager') {
        await adminService.createManager(payload)
      } else {
        await adminService.createDoctor(payload)
      }

      setSuccessMessage(form.role === 'manager'
        ? 'Менеджер успешно сохранён'
        : 'Персонал успешно сохранён')
      resetForm()
      await loadData()
    } catch (saveError) {
      console.error('Admin staff save failed', saveError)
      setError('Не удалось сохранить персонал.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(staffMember: User) {
    if (!window.confirm(`Удалить сотрудника "${staffMember.name}"?`)) {
      return
    }

    setError(null)

    try {
      await adminService.deleteStaff(staffMember.id)
      setSuccessMessage('Сотрудник удалён')
      await loadData()
    } catch (deleteError) {
      console.error('Admin staff delete failed', deleteError)
      setError('Не удалось удалить сотрудника.')
    }
  }

  function getRoomLabel(roomId?: string) {
    return getRoomName(rooms.find((room) => String(room.id) === roomId))
  }

  return (
    <div className="page-stack">
      <section className="admin-page-grid">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                <UsersRound size={14} />
                Администрирование
              </span>
              <h2>Персонал</h2>
            </div>
            <Button icon={<PlusCircle size={17} />} onClick={resetForm} variant="secondary">
              Добавить врача
            </Button>
          </div>

          {error ? <div className="modal-error">{error}</div> : null}
          {successMessage ? <div className="modal-success">{successMessage}</div> : null}

          {loading ? (
            <div className="empty-state compact-empty">
              <h2>Загружаем персонал</h2>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Кабинет</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((staffMember) => (
                    <tr key={staffMember.id}>
                      <td>{staffMember.name}</td>
                      <td>{getUserEmail(staffMember)}</td>
                      <td>{roleLabels[staffMember.role]}</td>
                      <td>{getRoomLabel(getUserRoomId(staffMember))}</td>
                      <td>
                        <div className="button-row">
                          <Button onClick={() => handleEdit(staffMember)} size="sm" variant="secondary">
                            Редактировать
                          </Button>
                          <Button onClick={() => void handleDelete(staffMember)} size="sm" variant="danger">
                            Удалить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="widget-panel admin-form-panel">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Персонал</span>
                <h2>{editingUserId ? 'Редактировать врача' : 'Добавить врача'}</h2>
              </div>
            </div>

            <label className="field">
              <span>Имя</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Иванов И.И."
                value={form.name}
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="doctor@smartq.test"
                type="email"
                value={form.email}
              />
            </label>

            <label className="field">
              <span>Пароль</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingUserId ? 'Оставьте пустым без изменений' : 'Пароль'}
                type="password"
                value={form.password}
              />
            </label>

            <label className="field">
              <span>Роль</span>
              <select
                disabled={Boolean(editingUserId) || !canCreateManagers}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  role: event.target.value as StaffFormState['role'],
                }))}
                value={form.role}
              >
                <option value="specialist">Специалист</option>
                {canCreateManagers ? <option value="manager">Менеджер</option> : null}
              </select>
            </label>

            <label className="field">
              <span>Кабинет</span>
              <select
                disabled={form.role === 'manager'}
                onChange={(event) => setForm((current) => ({ ...current, roomId: event.target.value }))}
                value={form.roomId}
              >
                <option value="">Не назначен</option>
                {rooms.map((room) => (
                  <option key={String(room.id)} value={String(room.id)}>
                    {getRoomName(room)}
                  </option>
                ))}
              </select>
            </label>

            <div className="modal-actions">
              <Button disabled={saving} onClick={resetForm} variant="ghost">
                Отмена
              </Button>
              <Button disabled={saving} type="submit" variant="primary">
                Сохранить
              </Button>
            </div>
          </form>
        </aside>
      </section>
    </div>
  )
}
