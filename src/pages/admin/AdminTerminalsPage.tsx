import { useEffect, useState, type FormEvent } from 'react'
import { PlusCircle, TabletSmartphone } from 'lucide-react'
import { adminService } from '@services/adminService'
import { subscribeServiceTypesChanged } from '@services/serviceTypeSync'
import type { AdminTerminalRecord, TicketSettingsServiceTypeOption } from '@services/api'
import { Button } from '@shared/ui/components'
import {
  getAdminErrorMessage,
  getRoomActive,
  getRoomName,
  type AdminRoomRecord,
} from './adminPageHelpers'

type TerminalFormState = {
  active: boolean
  location: string
  name: string
  roomIds: string[]
  serviceTypeIds: string[]
}

const emptyForm: TerminalFormState = {
  active: true,
  location: '',
  name: '',
  roomIds: [],
  serviceTypeIds: [],
}

function normalizeId(value: string): string | number {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) && value.trim() !== '' ? numberValue : value
}

function getServiceNames(terminal: AdminTerminalRecord, serviceTypes: TicketSettingsServiceTypeOption[]): string {
  if (terminal.serviceTypeIds.length === 0) {
    return 'Не выбраны'
  }

  return terminal.serviceTypeIds
    .map((id) => serviceTypes.find((serviceType) => String(serviceType.id) === String(id))?.name ?? String(id))
    .join(', ')
}

function getRoomNames(terminal: AdminTerminalRecord, rooms: AdminRoomRecord[]): string {
  if (terminal.roomIds.length === 0) {
    return 'Не выбраны'
  }

  return terminal.roomIds
    .map((id) => getRoomName(rooms.find((room) => String(room.id) === String(id)) ?? { id } as AdminRoomRecord))
    .join(', ')
}

export function TerminalsSection() {
  const [editingTerminalId, setEditingTerminalId] = useState<string | number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<TerminalFormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<AdminRoomRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [serviceTypes, setServiceTypes] = useState<TicketSettingsServiceTypeOption[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [terminals, setTerminals] = useState<AdminTerminalRecord[]>([])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const [nextTerminals, nextRooms, nextServiceTypes] = await Promise.all([
        adminService.getTerminals(),
        adminService.getRooms(),
        adminService.getServiceTypes(),
      ])

      setTerminals(nextTerminals)
      setRooms(nextRooms as AdminRoomRecord[])
      setServiceTypes(nextServiceTypes.filter((serviceType) => serviceType.active !== false))
    } catch (loadError) {
      console.error('Admin terminals load failed', loadError)
      setError(getAdminErrorMessage(loadError, 'Не удалось загрузить киоски'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => subscribeServiceTypesChanged(() => {
    void loadData()
  }), [])

  function resetForm() {
    setEditingTerminalId(null)
    setForm(emptyForm)
    setError(null)
  }

  function handleEdit(terminal: AdminTerminalRecord) {
    setEditingTerminalId(terminal.id)
    setForm({
      active: terminal.active,
      location: terminal.location,
      name: terminal.name,
      roomIds: terminal.roomIds.map(String),
      serviceTypeIds: terminal.serviceTypeIds.map(String),
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

  function toggleRoom(id: string) {
    setForm((current) => ({
      ...current,
      roomIds: current.roomIds.includes(id)
        ? current.roomIds.filter((item) => item !== id)
        : [...current.roomIds, id],
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Введите название терминала.')
      return
    }

    if (!form.location.trim()) {
      setError('Введите место установки терминала.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      active: form.active,
      location: form.location.trim(),
      name: form.name.trim(),
      roomIds: form.roomIds.map(normalizeId),
      serviceTypeIds: form.serviceTypeIds.map(normalizeId),
    }

    try {
      if (editingTerminalId) {
        await adminService.updateTerminal(editingTerminalId, payload)
      } else {
        await adminService.createTerminal(payload)
      }

      setSuccessMessage('Терминал сохранён')
      resetForm()
      await loadData()
    } catch (saveError) {
      console.error('Admin terminal save failed', saveError)
      setError(getAdminErrorMessage(saveError, 'Не удалось сохранить терминал'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(terminal: AdminTerminalRecord) {
    if (!window.confirm(`Удалить терминал "${terminal.name}"?`)) {
      return
    }

    setError(null)

    try {
      await adminService.deleteTerminal(terminal.id)
      setSuccessMessage('Терминал удалён')
      await loadData()
    } catch (deleteError) {
      console.error('Admin terminal delete failed', deleteError)
      setError(getAdminErrorMessage(deleteError, 'Не удалось удалить терминал'))
    }
  }

  const activeRooms = rooms.filter(getRoomActive)

  return (
    <div className="page-stack">
      <section className="admin-page-grid">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                <TabletSmartphone size={14} />
                Терминалы
              </span>
              <h2>Киоски</h2>
              <p className="admin-section-description">
                Настройте доступные услуги и места обслуживания для каждого терминала.
              </p>
            </div>
            <Button icon={<PlusCircle size={17} />} onClick={resetForm} variant="secondary">
              Добавить терминал
            </Button>
          </div>

          {error ? <div className="modal-error">{error}</div> : null}
          {successMessage ? <div className="modal-success">{successMessage}</div> : null}

          {loading ? (
            <div className="empty-state compact-empty"><h2>Загружаем киоски</h2></div>
          ) : terminals.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Место установки</th>
                    <th>Услуги</th>
                    <th>Места обслуживания</th>
                    <th>Активен</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {terminals.map((terminal) => (
                    <tr key={String(terminal.id)}>
                      <td>{terminal.name}</td>
                      <td>{terminal.location}</td>
                      <td>{getServiceNames(terminal, serviceTypes)}</td>
                      <td>{getRoomNames(terminal, rooms)}</td>
                      <td>{terminal.active ? 'Да' : 'Нет'}</td>
                      <td>
                        <div className="button-row">
                          <Button onClick={() => handleEdit(terminal)} size="sm" variant="secondary">
                            Редактировать
                          </Button>
                          <Button onClick={() => void handleDelete(terminal)} size="sm" variant="danger">
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
              <h2>Киоски не настроены</h2>
              <p>Добавьте первый терминал и выберите для него услуги.</p>
            </div>
          )}
        </div>

        <aside className="widget-panel admin-form-panel">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="panel-header">
              <div>
                <span className="eyebrow">Терминал</span>
                <h2>{editingTerminalId ? 'Редактировать киоск' : 'Добавить киоск'}</h2>
              </div>
            </div>

            <label className="field">
              <span>Название терминала</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Терминал 1 этаж"
                value={form.name}
              />
            </label>

            <label className="field">
              <span>Место установки</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="Холл / 1 этаж"
                value={form.location}
              />
            </label>

            <fieldset className="admin-checkbox-group">
              <legend>Услуги</legend>
              {serviceTypes.length > 0 ? serviceTypes.map((serviceType) => (
                <label key={String(serviceType.id)}>
                  <input
                    checked={form.serviceTypeIds.includes(String(serviceType.id))}
                    onChange={() => toggleServiceType(String(serviceType.id))}
                    type="checkbox"
                  />
                  <span>{serviceType.name}</span>
                </label>
              )) : <span className="admin-muted-text">Услуги не найдены</span>}
            </fieldset>

            <fieldset className="admin-checkbox-group">
              <legend>Места обслуживания</legend>
              {activeRooms.length > 0 ? activeRooms.map((room) => (
                <label key={String(room.id)}>
                  <input
                    checked={form.roomIds.includes(String(room.id))}
                    onChange={() => toggleRoom(String(room.id))}
                    type="checkbox"
                  />
                  <span>{getRoomName(room)}</span>
                </label>
              )) : <span className="admin-muted-text">Активные места обслуживания не найдены</span>}
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
