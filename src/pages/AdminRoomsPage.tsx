import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import {
  adminService,
  type AdminRoom,
  type AdminRoomInput,
} from '@services/adminService'
import { serviceTypeOptions } from '@shared/constants/serviceTypes'
import type { ServiceType } from '@shared/types'
import { getServiceTypeLabel } from '@shared/utils'
import { Button } from '@shared/ui/components'

const emptyRoomForm: AdminRoomInput = {
  name: '',
  department: '',
  specialistName: '',
  status: 'open',
  serviceTypes: [],
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось выполнить действие.'
}

const roomStatusLabels: Record<NonNullable<AdminRoomInput['status']>, string> = {
  busy: 'Занят',
  open: 'Открыт',
  paused: 'Пауза',
}

export function AdminRoomsPage() {
  const [editingRoomId, setEditingRoomId] = useState<string>()
  const [error, setError] = useState<string>()
  const [form, setForm] = useState<AdminRoomInput>(emptyRoomForm)
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<AdminRoom[]>([])

  async function loadRooms() {
    setLoading(true)
    setError(undefined)

    try {
      setRooms(await adminService.getRooms())
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRooms()
  }, [])

  function resetForm() {
    setEditingRoomId(undefined)
    setForm(emptyRoomForm)
  }

  function toggleServiceType(serviceType: ServiceType) {
    setForm((current) => {
      const selected = current.serviceTypes.includes(serviceType)

      return {
        ...current,
        serviceTypes: selected
          ? current.serviceTypes.filter((item) => item !== serviceType)
          : [...current.serviceTypes, serviceType],
      }
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim() || !form.department.trim()) {
      return
    }

    setLoading(true)
    setError(undefined)

    try {
      const input = {
        ...form,
        department: form.department.trim(),
        name: form.name.trim(),
        specialistName: form.specialistName?.trim() || undefined,
      }

      if (editingRoomId) {
        await adminService.updateRoom(editingRoomId, input)
      } else {
        await adminService.createRoom(input)
      }

      resetForm()
      await loadRooms()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(roomId: string) {
    setLoading(true)
    setError(undefined)

    try {
      await adminService.deleteRoom(roomId)
      await loadRooms()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(room: AdminRoom) {
    setEditingRoomId(room.id)
    setForm({
      department: room.department,
      name: room.name,
      serviceTypes: room.serviceTypes ?? [],
      specialistName: room.specialistName ?? '',
      status: room.status ?? 'open',
    })
  }

  return (
    <div className="page-stack admin-page">
      <section className="content-grid admin-crud-grid">
        <form className="primary-panel admin-form" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Администрирование</span>
              <h2>{editingRoomId ? 'Редактировать кабинет' : 'Создать кабинет'}</h2>
            </div>
            {editingRoomId ? (
              <Button icon={<X size={17} />} onClick={resetForm} variant="ghost">
                Отмена
              </Button>
            ) : null}
          </div>

          {error ? <div className="architecture-resource-banner architecture-resource-error">{error}</div> : null}

          <label className="field">
            <span>Название кабинета</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              value={form.name}
            />
          </label>

          <label className="field">
            <span>Отделение</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
              value={form.department}
            />
          </label>

          <label className="field">
            <span>Назначенный специалист</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, specialistName: event.target.value }))}
              value={form.specialistName ?? ''}
            />
          </label>

          <label className="field">
            <span>Статус</span>
            <select
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as AdminRoomInput['status'],
                }))
              }
              value={form.status}
            >
              <option value="open">Открыт</option>
              <option value="busy">Занят</option>
              <option value="paused">Пауза</option>
            </select>
          </label>

          <fieldset className="admin-checkbox-grid">
            <legend>Типы услуг</legend>
            {serviceTypeOptions.map((serviceType) => (
              <label key={serviceType.id}>
                <input
                  checked={form.serviceTypes.includes(serviceType.id)}
                  onChange={() => toggleServiceType(serviceType.id)}
                  type="checkbox"
                />
                <span>{serviceType.label}</span>
              </label>
            ))}
          </fieldset>

          <Button
            disabled={loading || !form.name.trim() || !form.department.trim()}
            icon={editingRoomId ? <Save size={17} /> : <Plus size={17} />}
            type="submit"
            variant="primary"
          >
            {editingRoomId ? 'Сохранить кабинет' : 'Создать кабинет'}
          </Button>
        </form>

        <section className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Кабинеты</span>
              <h2>Список кабинетов</h2>
            </div>
          </div>
          <div className="admin-table-shell">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Отделение</th>
                  <th>Услуги</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={5}>{loading ? 'Загрузка...' : 'Нет данных'}</td>
                  </tr>
                ) : null}
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td>{room.name}</td>
                    <td>{room.department}</td>
                    <td>{room.serviceTypes?.map(getServiceTypeLabel).join(', ') || '-'}</td>
                    <td>{room.status ? roomStatusLabels[room.status] : '-'}</td>
                    <td>
                      <div className="button-row">
                        <Button
                          icon={<Pencil size={16} />}
                          onClick={() => handleEdit(room)}
                          size="sm"
                          variant="secondary"
                        >
                          Изменить
                        </Button>
                        <Button
                          disabled={loading}
                          icon={<Trash2 size={16} />}
                          onClick={() => void handleDelete(room.id)}
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
