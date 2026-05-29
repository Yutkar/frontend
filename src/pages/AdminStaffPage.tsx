import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import {
  adminService,
  type AdminRoom,
  type StaffInput,
  type StaffMember,
  type StaffRole,
} from '@services/adminService'
import { Button } from '@shared/ui/components'

const emptyStaffForm: StaffInput = {
  email: '',
  name: '',
  role: 'doctor',
  roomId: '',
}

const staffRoles: StaffRole[] = ['doctor', 'nurse', 'specialist', 'manager', 'admin']
const staffRoleLabels: Record<StaffRole, string> = {
  admin: 'Администратор',
  doctor: 'Врач',
  manager: 'Менеджер',
  nurse: 'Медсестра',
  specialist: 'Специалист',
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось выполнить действие.'
}

export function AdminStaffPage() {
  const [editingUserId, setEditingUserId] = useState<string>()
  const [error, setError] = useState<string>()
  const [form, setForm] = useState<StaffInput>(emptyStaffForm)
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])

  async function loadStaffData() {
    setLoading(true)
    setError(undefined)

    try {
      const [roomsData, staffData] = await Promise.all([
        adminService.getRooms(),
        adminService.getStaff(),
      ])

      setRooms(roomsData)
      setStaff(staffData)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStaffData()
  }, [])

  function resetForm() {
    setEditingUserId(undefined)
    setForm(emptyStaffForm)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim() || !form.email.trim()) {
      return
    }

    setLoading(true)
    setError(undefined)

    try {
      const input = {
        ...form,
        email: form.email.trim(),
        name: form.name.trim(),
        roomId: form.roomId || undefined,
      }

      if (editingUserId) {
        await adminService.updateUser(editingUserId, input)
      } else {
        await adminService.createUser(input)
      }

      resetForm()
      await loadStaffData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(userId: string) {
    setLoading(true)
    setError(undefined)

    try {
      await adminService.deleteUser(userId)
      await loadStaffData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(member: StaffMember) {
    setEditingUserId(member.id)
    setForm({
      email: member.email,
      name: member.name,
      role: member.role,
      roomId: member.roomId ?? '',
    })
  }

  return (
    <div className="page-stack admin-page">
      <section className="content-grid admin-crud-grid">
        <form className="primary-panel admin-form" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Администрирование</span>
              <h2>{editingUserId ? 'Редактировать сотрудника' : 'Добавить сотрудника'}</h2>
            </div>
            {editingUserId ? (
              <Button icon={<X size={17} />} onClick={resetForm} variant="ghost">
                Отмена
              </Button>
            ) : null}
          </div>

          {error ? <div className="architecture-resource-banner architecture-resource-error">{error}</div> : null}

          <label className="field">
            <span>Имя</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              value={form.name}
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>

          <label className="field">
            <span>Роль</span>
            <select
              onChange={(event) =>
                setForm((current) => ({ ...current, role: event.target.value as StaffRole }))
              }
              value={form.role}
            >
              {staffRoles.map((role) => (
                <option key={role} value={role}>
                  {staffRoleLabels[role]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Назначенный кабинет</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, roomId: event.target.value }))}
              value={form.roomId ?? ''}
            >
              <option value="">Не назначен</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>

          <Button
            disabled={loading || !form.name.trim() || !form.email.trim()}
            icon={editingUserId ? <Save size={17} /> : <Plus size={17} />}
            type="submit"
            variant="primary"
          >
            {editingUserId ? 'Сохранить сотрудника' : 'Добавить сотрудника'}
          </Button>
        </form>

        <section className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Персонал</span>
              <h2>Врачи и медсёстры</h2>
            </div>
          </div>
          <div className="admin-table-shell">
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
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={5}>{loading ? 'Загрузка...' : 'Нет данных'}</td>
                  </tr>
                ) : null}
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{staffRoleLabels[member.role]}</td>
                    <td>{rooms.find((room) => room.id === member.roomId)?.name ?? '-'}</td>
                    <td>
                      <div className="button-row">
                        <Button
                          icon={<Pencil size={16} />}
                          onClick={() => handleEdit(member)}
                          size="sm"
                          variant="secondary"
                        >
                          Изменить
                        </Button>
                        <Button
                          disabled={loading}
                          icon={<Trash2 size={16} />}
                          onClick={() => void handleDelete(member.id)}
                          size="sm"
                          variant="danger"
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  )
}
