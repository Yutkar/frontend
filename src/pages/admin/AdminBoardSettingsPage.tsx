import { useEffect, useState } from 'react'
import { Monitor, Copy, Check, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { adminService } from '@services/adminService'
import { Button } from '@shared/ui/components'
import { getRoomBoardId } from '@shared/utils'
import { getAdminErrorMessage, getRoomName, getRoomActive, type AdminRoomRecord } from './adminPageHelpers'

type BoardScreen = {
  id: string
  name: string
  roomIds?: string[]
  roomNames: string[]
}

const STORAGE_KEY = 'smartq_board_screens'

function loadScreens(): BoardScreen[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function saveScreens(screens: BoardScreen[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(screens))
}

export function BoardSettingsSection() {
  const [rooms, setRooms] = useState<AdminRoomRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [screens, setScreens] = useState<BoardScreen[]>(loadScreens)
  const [copied, setCopied] = useState<string | null>(null)
  const [newScreenName, setNewScreenName] = useState('')
  const [newScreenRooms, setNewScreenRooms] = useState<string[]>([])

  useEffect(() => {
    setLoading(true)
    adminService.getRooms()
      .then((nextRooms) => setRooms(nextRooms as AdminRoomRecord[]))
      .catch((loadError) => setError(getAdminErrorMessage(loadError, 'Не удалось загрузить кабинеты')))
      .finally(() => setLoading(false))
  }, [])

  function toggleRoom(name: string) {
    setNewScreenRooms((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    )
  }

  function getScreenUrl(screen: BoardScreen): string {
    const base = window.location.origin
    const roomIds = screen.roomIds?.length
      ? screen.roomIds
      : activeRooms
        .filter((room) => screen.roomNames.includes(getRoomName(room)))
        .map(getRoomBoardId)
        .filter(Boolean)

    if (roomIds.length === 1) {
      return `${base}/board?roomId=${encodeURIComponent(roomIds[0])}`
    }

    return `${base}/board`
  }

  function getRoomBoardPath(room: AdminRoomRecord): string {
    return `/board?roomId=${encodeURIComponent(getRoomBoardId(room))}`
  }

  function getRoomBoardUrl(room: AdminRoomRecord): string {
    return `${window.location.origin}${getRoomBoardPath(room)}`
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  function openUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function addScreen() {
    if (!newScreenName.trim() || newScreenRooms.length === 0) return
    const roomIds = activeRooms
      .filter((room) => newScreenRooms.includes(getRoomName(room)))
      .map(getRoomBoardId)
      .filter(Boolean)
    const newScreens = [
      ...screens,
      { id: String(Date.now()), name: newScreenName.trim(), roomIds, roomNames: newScreenRooms },
    ]
    setScreens(newScreens)
    saveScreens(newScreens)
    setNewScreenName('')
    setNewScreenRooms([])
  }

  function deleteScreen(id: string) {
    const newScreens = screens.filter((screen) => screen.id !== id)
    setScreens(newScreens)
    saveScreens(newScreens)
  }

  const activeRooms = rooms.filter(getRoomActive)
  const generalUrl = `${window.location.origin}/board`

  return (
    <div className="page-stack">
      <section className="admin-page-grid">
        <div className="primary-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">
                <Monitor size={14} />
                Настройка
              </span>
              <h2>Табло</h2>
              <p className="admin-section-description">
                Ссылки на табло кабинетов и общее табло для всех вызовов.
              </p>
            </div>
          </div>

          {error ? <div className="modal-error">{error}</div> : null}

          {loading ? (
            <div className="empty-state compact-empty"><h2>Загружаем кабинеты</h2></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Табло</th>
                    <th>Кабинеты</th>
                    <th>Ссылка</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Общее табло */}
                  <tr>
                    <td><strong>Общее табло</strong></td>
                    <td>Все кабинеты</td>
                    <td>
                      <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                        {generalUrl}
                      </code>
                    </td>
                    <td>
                      <div className="button-row">
                        <Button
                          icon={<ExternalLink size={14} />}
                          onClick={() => openUrl(generalUrl)}
                          size="sm"
                          variant="secondary"
                        >
                          Открыть табло
                        </Button>
                        <Button
                          icon={copied === generalUrl ? <Check size={14} /> : <Copy size={14} />}
                          onClick={() => void copyUrl(generalUrl)}
                          size="sm"
                          variant="secondary"
                        >
                          {copied === generalUrl ? 'Скопировано' : 'Копировать'}
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Отдельные кабинеты */}
                  {activeRooms.map((room) => {
                    const name = getRoomName(room)
                    const url = getRoomBoardUrl(room)
                    return (
                      <tr key={String(room.id)}>
                        <td>{name}</td>
                        <td>{name}</td>
                        <td>
                          <div className="admin-link-cell">
                            <span>Ссылка на табло:</span>
                            <code>{url}</code>
                          </div>
                        </td>
                        <td>
                          <div className="button-row">
                            <Button
                              icon={<ExternalLink size={14} />}
                              onClick={() => openUrl(url)}
                              size="sm"
                              variant="secondary"
                            >
                              Открыть табло
                            </Button>
                            <Button
                              icon={copied === url ? <Check size={14} /> : <Copy size={14} />}
                              onClick={() => void copyUrl(url)}
                              size="sm"
                              variant="secondary"
                            >
                              {copied === url ? 'Скопировано' : 'Копировать'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Созданные экраны */}
                  {screens.map((screen) => {
                    const url = getScreenUrl(screen)
                    return (
                      <tr key={screen.id}>
                        <td><strong>{screen.name}</strong></td>
                        <td>{screen.roomNames.join(', ')}</td>
                        <td>
                          <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{url}</code>
                        </td>
                        <td>
                          <div className="button-row">
                            <Button
                              icon={<ExternalLink size={14} />}
                              onClick={() => openUrl(url)}
                              size="sm"
                              variant="secondary"
                            >
                              Открыть табло
                            </Button>
                            <Button
                              icon={copied === url ? <Check size={14} /> : <Copy size={14} />}
                              onClick={() => void copyUrl(url)}
                              size="sm"
                              variant="secondary"
                            >
                              {copied === url ? 'Скопировано' : 'Копировать'}
                            </Button>
                            <Button
                              icon={<Trash2 size={14} />}
                              onClick={() => deleteScreen(screen.id)}
                              size="sm"
                              variant="danger"
                            >
                              Удалить
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Форма создания объединённого экрана */}
        <aside className="widget-panel admin-form-panel">
          <div className="admin-form">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Объединённый экран</span>
                <h2>Добавить экран</h2>
              </div>
            </div>

            <label className="field">
              <span>Название экрана</span>
              <input
                onChange={(event) => setNewScreenName(event.target.value)}
                placeholder="Например: Приёмный покой"
                value={newScreenName}
              />
            </label>

            <fieldset className="admin-checkbox-group">
              <legend>Выберите кабинеты</legend>
              {activeRooms.map((room) => {
                const name = getRoomName(room)
                return (
                  <label key={String(room.id)}>
                    <input
                      checked={newScreenRooms.includes(name)}
                      onChange={() => toggleRoom(name)}
                      type="checkbox"
                    />
                    <span>{name}</span>
                  </label>
                )
              })}
            </fieldset>

            <div className="modal-actions">
              <Button
                disabled={!newScreenName.trim() || newScreenRooms.length === 0}
                icon={<Plus size={16} />}
                onClick={addScreen}
                variant="primary"
              >
                Добавить экран
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
