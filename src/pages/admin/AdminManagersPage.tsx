import { useEffect, useState, type FormEvent } from 'react'
import { PlusCircle, ShieldCheck } from 'lucide-react'
import { adminService } from '@services/adminService'
import type { User } from '@shared/types'
import { Button } from '@shared/ui/components'
import { getUserEmail } from './adminPageHelpers'

type ManagerFormState = {
  email: string
  name: string
  password: string
}

const emptyForm: ManagerFormState = {
  email: '',
  name: '',
  password: '',
}

export function AdminManagersPage() {
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ManagerFormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [managers, setManagers] = useState<User[]>([])
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      setManagers(await adminService.getManagers())
    } catch (loadError) {
      console.error('Admin managers load failed', loadError)
      setError('Не удалось загрузить менеджеров.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function resetForm() {
    setEditingManagerId(null)
    setForm(emptyForm)
    setError(null)
  }

  function handleEdit(manager: User) {
    setEditingManagerId(manager.id)
    setForm({
      email: manager.email ?? '',
      name: manager.name,
      password: '',
    })
    setSuccessMessage(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim() || !form.email.trim()) {
      setError('Введите имя и email.')
      return
    }

    if (!editingManagerId && !form.password.trim()) {
      setError('Введите пароль для нового менеджера.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      email: form.email.trim(),
      name: form.name.trim(),
      password: form.password.trim() || undefined,
    }

    try {
      if (editingManagerId) {
        await adminService.updateManager(editingManagerId, payload)
      } else {
        await adminService.createManager(payload)
      }

      setSuccessMessage('Менеджер успешно сохранён')
      resetForm()
      await loadData()
    } catch (saveError) {
      console.error('Admin manager save failed', saveError)
      setError('Не удалось сохранить менеджера.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(manager: User) {
    if (!window.confirm(`Удалить менеджера "${manager.name}"?`)) {
      return
    }

    setError(null)

    try {
      await adminService.deleteManager(manager.id)
      setSuccessMessage('Менеджер удалён')
      await loadData()
    } catch (deleteError) {
      console.error('Admin manager delete failed', deleteError)
      setError('Не удалось удалить менеджера.')
    }
  }

  return (
    <div className="page-stack">
      <section className="admin-page-grid">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                <ShieldCheck size={14} />
                Администрирование
              </span>
              <h2>Менеджеры</h2>
            </div>
            <Button icon={<PlusCircle size={17} />} onClick={resetForm} variant="secondary">
              Добавить менеджера
            </Button>
          </div>

          {error ? <div className="modal-error">{error}</div> : null}
          {successMessage ? <div className="modal-success">{successMessage}</div> : null}

          {loading ? (
            <div className="empty-state compact-empty">
              <h2>Загружаем менеджеров</h2>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((manager) => (
                    <tr key={manager.id}>
                      <td>{manager.name}</td>
                      <td>{getUserEmail(manager)}</td>
                      <td>
                        <div className="button-row">
                          <Button onClick={() => handleEdit(manager)} size="sm" variant="secondary">
                            Редактировать
                          </Button>
                          <Button onClick={() => void handleDelete(manager)} size="sm" variant="danger">
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
                <span className="eyebrow">Менеджер</span>
                <h2>{editingManagerId ? 'Редактировать менеджера' : 'Добавить менеджера'}</h2>
              </div>
            </div>

            <label className="field">
              <span>Имя</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Амина Каримова"
                value={form.name}
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="manager@smartq.test"
                type="email"
                value={form.email}
              />
            </label>

            <label className="field">
              <span>Пароль</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingManagerId ? 'Оставьте пустым без изменений' : 'Пароль'}
                type="password"
                value={form.password}
              />
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
