import { useEffect, useState } from 'react'
import { Monitor, Copy, Check, ExternalLink, Plus, Trash2, Edit3, Save, X } from 'lucide-react'
import { adminService } from '@services/adminService'
import {
  getVoiceActionLabel,
  getVoiceAudienceLabel,
  voiceSettingsService,
  type VoiceAction,
  type VoiceAudience,
  type VoiceSettings,
} from '@services/voiceSettingsService'
import type { BoardScreen, BoardSettings, BoardSettingsProfile, BoardTemplate } from '@services/api'
import { useLocale } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { copyTextToClipboard } from '@shared/utils/clipboard'
import { getRoomBoardId } from '@shared/utils'
import { getAdminErrorMessage, getRoomName, getRoomActive, type AdminRoomRecord } from './adminPageHelpers'

const defaultBoardSettings: BoardSettings = {
  boardType: 'general',
  recentCallsLimit: 10,
  roomBoardId: '',
  screens: [],
  showRecentCalls: true,
  showTime: true,
  template: 'classic',
  voiceEnabled: true,
}

const boardTemplates: Array<{
  description: string
  label: string
  value: BoardTemplate
}> = [
  { description: 'Крупный текущий талон и последние вызовы', label: 'Классический', value: 'classic' },
  { description: 'Несколько крупных карточек вызовов', label: 'Сетка', value: 'grid' },
  { description: 'Компактный список время, талон, место', label: 'Список', value: 'list' },
  { description: 'Только текущий талон и место', label: 'Минималистичный', value: 'minimal' },
]

export function BoardSettingsSection() {
  const t = useLocale()
  const [rooms, setRooms] = useState<AdminRoomRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [boardSettings, setBoardSettings] = useState<BoardSettings>(defaultBoardSettings)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => voiceSettingsService.getSettings())
  const [copied, setCopied] = useState<string | null>(null)
  const [draftProfile, setDraftProfile] = useState<BoardSettingsProfile | null>(null)
  const [newScreenName, setNewScreenName] = useState('')
  const [newScreenRooms, setNewScreenRooms] = useState<string[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminService.getRooms(),
      adminService.getBoardSettings(),
    ])
      .then(([nextRooms, nextBoardSettings]) => {
        setRooms(nextRooms as AdminRoomRecord[])
        setBoardSettings(nextBoardSettings)
      })
      .catch((loadError) => setError(getAdminErrorMessage(loadError, 'Не удалось загрузить настройки табло')))
      .finally(() => setLoading(false))
  }, [])

  function toggleRoom(name: string) {
    setNewScreenRooms((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    )
  }

  function getScreenUrl(screen: BoardScreen): string {
    const profile = getBoardProfile(
      `screen-${screen.id}`,
      screen.name,
      screen.roomIds?.length === 1 ? 'individual' : 'general',
      screen.roomIds?.[0] ?? '',
    )
    const profileParam = `profileId=${encodeURIComponent(profile.id)}`

    if (profile.boardType === 'individual' && profile.roomBoardId) {
      return `${window.location.origin}/board?roomId=${encodeURIComponent(profile.roomBoardId)}&${profileParam}`
    }

    return `${window.location.origin}/board?${profileParam}`
  }

  function getRoomBoardPath(room: AdminRoomRecord, profile?: BoardSettingsProfile): string {
    const roomBoardId = getRoomBoardId(room)
    const profileParam = profile ? `&profileId=${encodeURIComponent(profile.id)}` : ''

    return `/board?roomId=${encodeURIComponent(roomBoardId)}${profileParam}`
  }

  function getRoomBoardUrl(room: AdminRoomRecord, profile?: BoardSettingsProfile): string {
    return `${window.location.origin}${getRoomBoardPath(room, profile)}`
  }

  function getProfileUrl(profile: BoardSettingsProfile): string {
    const profileParam = `profileId=${encodeURIComponent(profile.id)}`

    if (profile.boardType === 'individual' && profile.roomBoardId) {
      return `${window.location.origin}/board?roomId=${encodeURIComponent(profile.roomBoardId)}&${profileParam}`
    }

    return `${window.location.origin}/board?${profileParam}`
  }

  function getDefaultProfile(
    id: string,
    name: string,
    boardType: BoardSettingsProfile['boardType'],
    roomBoardId = '',
  ): BoardSettingsProfile {
    return {
      boardType,
      id,
      name,
      recentCallsLimit: boardSettings.recentCallsLimit,
      roomBoardId,
      showRecentCalls: boardSettings.showRecentCalls,
      showTime: boardSettings.showTime,
      template: boardSettings.template,
      voiceEnabled: boardSettings.voiceEnabled,
    }
  }

  function getBoardProfile(
    id: string,
    name: string,
    boardType: BoardSettingsProfile['boardType'],
    roomBoardId = '',
  ): BoardSettingsProfile {
    const savedProfile = boardSettings.profiles?.find((profile) => profile.id === id)

    return savedProfile ?? getDefaultProfile(id, name, boardType, roomBoardId)
  }

  function startEditProfile(profile: BoardSettingsProfile) {
    setDraftProfile(profile)
  }

  function updateDraftProfile(nextProfile: Partial<BoardSettingsProfile>) {
    setDraftProfile((current: BoardSettingsProfile | null) => current ? { ...current, ...nextProfile } : current)
  }

  function cancelEditProfile() {
    setDraftProfile(null)
  }

  async function saveDraftProfile() {
    if (!draftProfile) return

    const profiles = boardSettings.profiles ?? []
    const nextScreens = draftProfile.id.startsWith('screen-')
      ? boardSettings.screens.map((screen) => {
        if (`screen-${screen.id}` !== draftProfile.id) {
          return screen
        }

        const selectedRoom = rooms.find((room) => getRoomBoardId(room) === draftProfile.roomBoardId)

        return {
          ...screen,
          name: draftProfile.name,
          roomIds: draftProfile.boardType === 'individual' && draftProfile.roomBoardId
            ? [draftProfile.roomBoardId]
            : screen.roomIds,
          roomNames: draftProfile.boardType === 'individual' && selectedRoom
            ? [getRoomName(selectedRoom)]
            : screen.roomNames,
        }
      })
      : boardSettings.screens
    const nextProfiles = profiles.some((profile) => profile.id === draftProfile.id)
      ? profiles.map((profile) => profile.id === draftProfile.id ? draftProfile : profile)
      : [...profiles, draftProfile]
    const savedSettings = await adminService.updateBoardSettings({
      ...boardSettings,
      boardType: draftProfile.boardType,
      profiles: nextProfiles,
      recentCallsLimit: draftProfile.recentCallsLimit,
      roomBoardId: draftProfile.roomBoardId,
      screens: nextScreens,
      showRecentCalls: draftProfile.showRecentCalls,
      showTime: draftProfile.showTime,
      template: draftProfile.template,
      voiceEnabled: draftProfile.voiceEnabled,
    })

    setBoardSettings(savedSettings)
    cancelEditProfile()
  }

  async function copyUrl(url: string) {
    await copyTextToClipboard(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  function openUrl(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function updateBoardSettings(nextSettings: Partial<BoardSettings>) {
    const savedSettings = await adminService.updateBoardSettings({
      ...boardSettings,
      ...nextSettings,
    })

    setBoardSettings(savedSettings)
  }

  async function addScreen() {
    if (!newScreenName.trim() || newScreenRooms.length === 0) return
    const roomIds = activeRooms
      .filter((room) => newScreenRooms.includes(getRoomName(room)))
      .map(getRoomBoardId)
      .filter(Boolean)
    const newScreens = [
      ...boardSettings.screens,
      { id: String(Date.now()), name: newScreenName.trim(), roomIds, roomNames: newScreenRooms },
    ]
    await updateBoardSettings({ screens: newScreens })
    setNewScreenName('')
    setNewScreenRooms([])
  }

  async function deleteScreen(id: string) {
    await updateBoardSettings({
      screens: boardSettings.screens.filter((screen) => screen.id !== id),
    })
  }

  function updateVoiceSettings(nextSettings: Partial<VoiceSettings>) {
    setVoiceSettings((current) => voiceSettingsService.saveSettings({ ...current, ...nextSettings }))
  }

  const activeRooms = rooms.filter(getRoomActive)
  const generalUrl = `${window.location.origin}/board`
  const generalProfile = getBoardProfile('general', 'Общее табло', 'general')
  const roomProfiles = rooms.map((room) => {
    const boardId = getRoomBoardId(room)

    return {
      profile: getBoardProfile(`room-${boardId}`, getRoomName(room), 'individual', boardId),
      room,
    }
  })
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
                Ссылки на табло мест обслуживания и общее табло для всех вызовов.
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
                    <th>Места обслуживания</th>
                    <th>Ссылка</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Общее табло */}
                  <tr>
                    <td><strong>Общее табло</strong></td>
                    <td>{t.queue.allRooms}</td>
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
                        <Button
                          icon={<Edit3 size={14} />}
                          onClick={() => startEditProfile(generalProfile)}
                          size="sm"
                          variant="secondary"
                        >
                          Редактировать
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Отдельные места обслуживания */}
                  {roomProfiles.map(({ profile, room }) => {
                    const name = getRoomName(room)
                    const url = getRoomBoardUrl(room, profile)
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
                            <Button
                              icon={<Edit3 size={14} />}
                              onClick={() => startEditProfile(profile)}
                              size="sm"
                              variant="secondary"
                            >
                              Редактировать
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Созданные экраны */}
                  {boardSettings.screens.map((screen) => {
                    const profile = getBoardProfile(
                      `screen-${screen.id}`,
                      screen.name,
                      screen.roomIds?.length === 1 ? 'individual' : 'general',
                      screen.roomIds?.[0] ?? '',
                    )
                    const url = getScreenUrl(screen)
                    return (
                      <tr key={screen.id}>
                        <td><strong>{profile.name}</strong></td>
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
                              icon={<Edit3 size={14} />}
                              onClick={() => startEditProfile(profile)}
                              size="sm"
                              variant="secondary"
                            >
                              Редактировать
                            </Button>
                            <Button
                              icon={<Trash2 size={14} />}
                              onClick={() => void deleteScreen(screen.id)}
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
                <span className="eyebrow">Редактирование</span>
                <h2>{draftProfile ? draftProfile.name : 'Настройки табло'}</h2>
              </div>
            </div>

            {!draftProfile ? (
              <p className="admin-muted-text">
                Выберите табло в списке и нажмите «Редактировать».
              </p>
            ) : (
              <>
            <label className="field">
              <span>Название</span>
              <input
                onChange={(event) => updateDraftProfile({ name: event.target.value })}
                value={draftProfile.name}
              />
            </label>

            <label className="field">
              <span>Тип табло</span>
              <select
                onChange={(event) => updateDraftProfile({
                  boardType: event.target.value as BoardSettings['boardType'],
                  roomBoardId: event.target.value === 'general' ? '' : draftProfile.roomBoardId,
                })}
                value={draftProfile.boardType}
              >
                <option value="general">Общее</option>
                <option value="individual">Индивидуальное</option>
              </select>
            </label>

            {draftProfile.boardType === 'individual' ? (
              <label className="field">
                <span>Место обслуживания</span>
                <select
                  onChange={(event) => updateDraftProfile({ roomBoardId: event.target.value })}
                  value={draftProfile.roomBoardId ?? ''}
                >
                  <option value="">Выберите место обслуживания</option>
                  {rooms.map((room) => {
                    const boardId = getRoomBoardId(room)

                    return (
                      <option key={String(room.id)} value={boardId}>
                        {getRoomName(room)}
                      </option>
                    )
                  })}
                </select>
              </label>
            ) : null}

            <div className="admin-link-cell">
              <span>Ссылка выбранного табло:</span>
              <code>{getProfileUrl(draftProfile)}</code>
            </div>

            <fieldset className="admin-checkbox-group">
              <legend>Вид табло</legend>
              <div className="board-template-grid">
                {boardTemplates.map((template) => (
                  <button
                    className={draftProfile.template === template.value
                      ? 'board-template-card active'
                      : 'board-template-card'}
                    key={template.value}
                    onClick={() => updateDraftProfile({ template: template.value })}
                    type="button"
                  >
                    <span className={`board-template-preview ${template.value}`} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <strong>{template.label}</strong>
                    <small>{template.description}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="admin-toggle-row">
              <input
                checked={draftProfile.voiceEnabled}
                onChange={(event) => updateDraftProfile({ voiceEnabled: event.target.checked })}
                type="checkbox"
              />
              <span>Озвучка включена</span>
            </label>

            <label className="admin-toggle-row">
              <input
                checked={draftProfile.showRecentCalls}
                onChange={(event) => updateDraftProfile({ showRecentCalls: event.target.checked })}
                type="checkbox"
              />
              <span>Показывать последние вызовы</span>
            </label>

            <label className="field">
              <span>Количество последних вызовов</span>
              <select
                disabled={!draftProfile.showRecentCalls}
                onChange={(event) => updateDraftProfile({
                  recentCallsLimit: Number(event.target.value) as BoardSettings['recentCallsLimit'],
                })}
                value={draftProfile.recentCallsLimit}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </label>

            <label className="admin-toggle-row">
              <input
                checked={draftProfile.showTime}
                onChange={(event) => updateDraftProfile({ showTime: event.target.checked })}
                type="checkbox"
              />
              <span>Показывать время</span>
            </label>

            <div className="modal-actions">
              <Button
                icon={<X size={16} />}
                onClick={cancelEditProfile}
                variant="secondary"
              >
                Отмена
              </Button>
              <Button
                disabled={!draftProfile.name.trim() || (draftProfile.boardType === 'individual' && !draftProfile.roomBoardId)}
                icon={<Save size={16} />}
                onClick={() => void saveDraftProfile()}
                variant="primary"
              >
                Сохранить
              </Button>
            </div>
              </>
            )}
          </div>

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
              <legend>Выберите места обслуживания</legend>
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
                onClick={() => void addScreen()}
                variant="primary"
              >
                Добавить экран
              </Button>
            </div>
          </div>

          <div className="admin-form">
            <div className="panel-header">
              <div>
                <span className="eyebrow">{t.nav.tvBoard}</span>
                <h2>{t.admin.voiceSettings}</h2>
              </div>
            </div>

            <label className="field">
              <span>{t.admin.voiceAddress}</span>
              <select
                onChange={(event) => updateVoiceSettings({ audience: event.target.value as VoiceAudience })}
                value={voiceSettings.audience}
              >
                <option value="patient">{getVoiceAudienceLabel('patient')}</option>
                <option value="client">{getVoiceAudienceLabel('client')}</option>
              </select>
            </label>

            <label className="field">
              <span>{t.admin.voiceAction}</span>
              <select
                onChange={(event) => updateVoiceSettings({ action: event.target.value as VoiceAction })}
                value={voiceSettings.action}
              >
                <option value="approach">{getVoiceActionLabel('approach')}</option>
                <option value="enter">{getVoiceActionLabel('enter')}</option>
              </select>
            </label>
          </div>
        </aside>
      </section>
    </div>
  )
}
