import { useEffect, useState, type FormEvent } from 'react'
import { PlusCircle, UsersRound } from 'lucide-react'
import { adminService } from '@services/adminService'
import { useLocale } from '@shared/locales/useLocale'
import type { User } from '@shared/types'
import { Button } from '@shared/ui/components'
import {
  getAdminErrorMessage,
  getRoomActive,
  getRoomName,
  getUserLogin,
  getUserRoomIds,
  roleLabels,
  type AdminRoomRecord,
} from './adminPageHelpers'

type StaffFormState = {
  login: string
  name: string
  password: string
  role: 'specialist'
  roomIds: string[]
}

const emptyForm: StaffFormState = {
  login: '',
  name: '',
  password: '',
  role: 'specialist',
  roomIds: [],
}

type StaffSectionProps = {
  onStaffChange?: () => void
  refreshKey?: number
}

export function StaffSection({ onStaffChange, refreshKey = 0 }: StaffSectionProps) {
  const t = useLocale()
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<StaffFormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<AdminRoomRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<User[]>([])
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
    } catch (loadError) {
      console.error('Admin staff load failed', loadError)
      setError(getAdminErrorMessage(loadError, 'Не удалось загрузить персонал'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [refreshKey])

  function resetForm() {
    setEditingUserId(null)
    setForm(emptyForm)
    setError(null)
  }

  function handleEdit(staffMember: User) {
    setEditingUserId(staffMember.id)
    setForm({
      login: staffMember.email ?? '',
      name: staffMember.name,
      password: '',
      role: 'specialist',
      roomIds: getUserRoomIds(staffMember),
    })
    setSuccessMessage(null)
  }

  function toggleRoom(roomId: string) {
    setForm((current) => ({
      ...current,
      roomIds: current.roomIds.includes(roomId)
        ? current.roomIds.filter((id) => id !== roomId)
        : [...current.roomIds, roomId],
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim() || !form.login.trim()) {
      setError('Введите имя и логин.')
      return
    }

    if (!editingUserId && !form.password.trim()) {
      setError('Введите пароль для нового аккаунта.')
      return
    }

    setSaving(true)
    setError(null)

    const primaryRoomId = form.roomIds[0]
    const payload = {
      assignedRoomId: primaryRoomId,
      assignedRoomIds: form.roomIds,
      email: form.login.trim(),
      name: form.name.trim(),
      password: form.password.trim() || undefined,
      role: form.role,
      roomId: primaryRoomId,
      roomIds: form.roomIds,
    }

    try {
      const savedUser = editingUserId
        ? await adminService.updateStaff(editingUserId, payload)
        : await adminService.createDoctor(payload)

      setSuccessMessage(savedUser.roomAssignmentPending
        ? 'Пользователь создан. Кабинет можно назначить после обновления списка.'
        : 'Врач успешно сохранён')
      resetForm()
      await loadData()
      onStaffChange?.()
    } catch (saveError) {
      console.error('Admin staff save failed', saveError)
      setError(getAdminErrorMessage(
        saveError,
        editingUserId ? 'Не удалось сохранить пользователя' : 'Не удалось создать врача',
      ))
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
      setSuccessMessage('Врач удалён')
      await loadData()
      onStaffChange?.()
    } catch (deleteError) {
      console.error('Admin staff delete failed', deleteError)
      setError(getAdminErrorMessage(deleteError, 'Не удалось удалить врача'))
    }
  }

  function getRoomLabel(roomId?: string) {
    return getRoomName(rooms.find((room) => String(room.id) === roomId))
  }

  function getRoomLabels(roomIds: string[]) {
    if (roomIds.length === 0) {
      return getRoomLabel(undefined)
    }

    return roomIds.map(getRoomLabel).join(', ')
  }

  return (
    <div className="page-stack">
      <section className="admin-page-grid">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                <UsersRound size={14} />
                Управление
              </span>
              <h2>{t.admin.staff}</h2>
              <p className="admin-section-description">
                Создание врачей и назначение кабинетов.
              </p>
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
          ) : staff.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Логин</th>
                    <th>Роль</th>
                    <th>Место обслуживания</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((staffMember) => (
                    <tr key={staffMember.id}>
                      <td>{staffMember.name}</td>
                      <td>{getUserLogin(staffMember)}</td>
                      <td>{roleLabels[staffMember.role]}</td>
                      <td>{getRoomLabels(getUserRoomIds(staffMember))}</td>
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
          ) : (
            <div className="empty-state compact-empty">
              <h2>Врачи не найдены</h2>
              <p>Добавьте врача и назначьте ему кабинет.</p>
            </div>
          )}
        </div>

        <aside className="widget-panel admin-form-panel">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">{t.admin.staff}</span>
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
              <span>Логин</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))}
                placeholder="Введите логин"
                type="text"
                value={form.login}
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
                onChange={(event) => setForm((current) => ({
                  ...current,
                  role: event.target.value as StaffFormState['role'],
                }))}
                value={form.role}
              >
                <option value="specialist">Специалист</option>
              </select>
            </label>

            <fieldset className="admin-checkbox-group">
              <legend>Кабинеты</legend>
              {rooms.filter(getRoomActive).map((room) => {
                const roomId = String(room.id)

                return (
                  <label key={roomId}>
                    <input
                      checked={form.roomIds.includes(roomId)}
                      onChange={() => toggleRoom(roomId)}
                      type="checkbox"
                    />
                    <span>{getRoomName(room)}</span>
                  </label>
                )
              })}
            </fieldset>
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

export function AdminStaffPage() {
  return <StaffSection />
}
