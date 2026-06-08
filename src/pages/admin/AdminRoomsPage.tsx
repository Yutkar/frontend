import { useEffect, useState, type FormEvent } from 'react'
import { Building2, Check, Copy, ExternalLink, PlusCircle } from 'lucide-react'
import { adminService } from '@services/adminService'
import type { TicketSettingsServiceTypeOption } from '@services/api'
import { Button } from '@shared/ui/components'
import {
  getRoomActive,
  getAdminErrorMessage,
  getRoomName,
  getRoomServiceTypeIds,
  getServiceTypeNames,
  type AdminRoomRecord,
} from './adminPageHelpers'

type RoomFormState = {
  active: boolean
  name: string
  serviceTypeIds: string[]
}

const emptyForm: RoomFormState = {
  active: true,
  name: '',
  serviceTypeIds: [],
}

type RoomsSectionProps = {
  onRoomsChange?: () => void
}

function normalizeId(value: string): string | number {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) && value.trim() !== '' ? numberValue : value
}

function toRoomNumberInput(room: AdminRoomRecord): string {
  return getRoomName(room).replace(/^Кабинет\s*/i, '').replace(/\D/g, '')
}

function normalizeRoomNumberInput(value: string): string {
  return value.replace(/\D/g, '')
}

export function RoomsSection({ onRoomsChange }: RoomsSectionProps) {
  const [editingRoomId, setEditingRoomId] = useState<string | number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<RoomFormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<AdminRoomRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [serviceTypes, setServiceTypes] = useState<TicketSettingsServiceTypeOption[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copiedBoardPath, setCopiedBoardPath] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [nextRooms, nextServiceTypes] = await Promise.all([
        adminService.getRooms(),
        adminService.getServiceTypes(),
      ])

      setRooms(nextRooms as AdminRoomRecord[])
      setServiceTypes(nextServiceTypes)
    } catch (loadError) {
      console.error('Admin rooms load failed', loadError)
      setError(getAdminErrorMessage(loadError, 'Не удалось загрузить кабинеты'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function resetForm() {
    setEditingRoomId(null)
    setForm(emptyForm)
    setError(null)
  }

  function handleEdit(room: AdminRoomRecord) {
    setEditingRoomId(room.id)
    setForm({
      active: getRoomActive(room),
      name: toRoomNumberInput(room),
      serviceTypeIds: getRoomServiceTypeIds(room),
    })
    setSuccessMessage(null)
  }

  function toggleServiceType(id: string) {
    setForm((current) => ({
      ...current,
      serviceTypeIds: current.serviceTypeIds.includes(id)
        ? current.serviceTypeIds.filter((item) => item !== id)
        : [...current.serviceTypeIds, id],
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const roomNumber = normalizeRoomNumberInput(form.name)

    if (!roomNumber) {
      setError('Введите номер кабинета.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      active: form.active,
      isActive: form.active,
      name: roomNumber,
      serviceTypeIds: form.serviceTypeIds.map(normalizeId),
    }

    try {
      if (editingRoomId) {
        await adminService.updateRoom(editingRoomId, payload)
      } else {
        await adminService.createRoom(payload)
      }

      setSuccessMessage('Кабинет успешно сохранён')
      resetForm()
      await loadData()
      onRoomsChange?.()
    } catch (saveError) {
      console.error('Admin room save failed', saveError)
      setError(getAdminErrorMessage(
        saveError,
        editingRoomId ? 'Не удалось сохранить кабинет' : 'Не удалось создать кабинет',
      ))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(room: AdminRoomRecord) {
    if (!window.confirm(`Удалить кабинет "${getRoomName(room)}"?`)) {
      return
    }

    setError(null)

    try {
      await adminService.deleteRoom(room.id)
      setSuccessMessage('Кабинет удалён')
      await loadData()
      onRoomsChange?.()
    } catch (deleteError) {
      console.error('Admin room delete failed', deleteError)
      setError(getAdminErrorMessage(deleteError, 'Не удалось удалить кабинет'))
    }
  }

  function getBoardPath(room: AdminRoomRecord): string {
    return `/board?roomId=${encodeURIComponent(String(room.id))}`
  }

  function openBoard(room: AdminRoomRecord) {
    window.open(getBoardPath(room), '_blank', 'noopener,noreferrer')
  }

  async function copyBoardLink(room: AdminRoomRecord) {
    const path = getBoardPath(room)
    const url = `${window.location.origin}${path}`

    await navigator.clipboard.writeText(url)
    setCopiedBoardPath(path)
    window.setTimeout(() => setCopiedBoardPath(null), 2_000)
  }

  return (
    <div className="page-stack">
      <section className="admin-page-grid">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                <Building2 size={14} />
                Управление
              </span>
              <h2>Кабинеты</h2>
              <p className="admin-section-description">
                Создание, редактирование и деактивация кабинетов учреждения.
              </p>
            </div>
            <Button icon={<PlusCircle size={17} />} onClick={resetForm} variant="secondary">
              Добавить кабинет
            </Button>
          </div>

          {error ? <div className="modal-error">{error}</div> : null}
          {successMessage ? <div className="modal-success">{successMessage}</div> : null}

          {loading ? (
            <div className="empty-state compact-empty">
              <h2>Загружаем кабинеты</h2>
            </div>
          ) : rooms.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Номер кабинета</th>
                    <th>Типы услуг</th>
                    <th>Ссылка на табло</th>
                    <th>Активен</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={String(room.id)}>
                      <td>{getRoomName(room)}</td>
                      <td>{getServiceTypeNames(room, serviceTypes)}</td>
                      <td>
                        <div className="admin-link-cell">
                          <span>Ссылка на табло:</span>
                          <code>{getBoardPath(room)}</code>
                        </div>
                      </td>
                      <td>{getRoomActive(room) ? 'Да' : 'Нет'}</td>
                      <td>
                        <div className="button-row">
                          <Button
                            icon={<ExternalLink size={14} />}
                            onClick={() => openBoard(room)}
                            size="sm"
                            variant="secondary"
                          >
                            Открыть табло
                          </Button>
                          <Button
                            icon={copiedBoardPath === getBoardPath(room) ? <Check size={14} /> : <Copy size={14} />}
                            onClick={() => void copyBoardLink(room)}
                            size="sm"
                            variant="secondary"
                          >
                            {copiedBoardPath === getBoardPath(room) ? 'Скопировано' : 'Скопировать ссылку'}
                          </Button>
                          <Button onClick={() => handleEdit(room)} size="sm" variant="secondary">
                            Редактировать
                          </Button>
                          <Button onClick={() => void handleDelete(room)} size="sm" variant="danger">
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
              <h2>Кабинеты не найдены</h2>
              <p>Добавьте первый кабинет учреждения.</p>
            </div>
          )}
        </div>

        <aside className="widget-panel admin-form-panel">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Кабинет</span>
                <h2>{editingRoomId ? 'Редактировать кабинет' : 'Добавить кабинет'}</h2>
              </div>
            </div>

            <label className="field">
              <span>Номер кабинета</span>
              <input
                inputMode="numeric"
                onChange={(event) => setForm((current) => ({
                  ...current,
                  name: normalizeRoomNumberInput(event.target.value),
                }))}
                pattern="[0-9]*"
                placeholder="123"
                value={form.name}
              />
            </label>

            <fieldset className="admin-checkbox-group">
              <legend>Типы услуг</legend>
              {serviceTypes.map((serviceType) => (
                <label key={String(serviceType.id)}>
                  <input
                    checked={form.serviceTypeIds.includes(String(serviceType.id))}
                    onChange={() => toggleServiceType(String(serviceType.id))}
                    type="checkbox"
                  />
                  <span>{serviceType.name}</span>
                </label>
              ))}
            </fieldset>

            <label className="admin-toggle-row">
              <input
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                type="checkbox"
              />
              <span>Активен</span>
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

export function AdminRoomsPage() {
  return <RoomsSection />
}
