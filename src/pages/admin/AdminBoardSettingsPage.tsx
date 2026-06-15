import { useEffect, useState, type ChangeEvent } from 'react'
import {
  Monitor,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Image as ImageIcon,
  Upload,
  Video,
} from 'lucide-react'
import { adminService } from '@services/adminService'
import {
  boardPromoMediaService,
  getBoardPromoUrlInputValue,
  type BoardPromoMedia,
} from '@services/boardPromoMediaService'
import {
  boardTemplateOptions,
  defaultBoardTemplate,
} from '@services/boardTemplateService'
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

function BoardTemplateSelector({
  onSelect,
  selectedTemplate,
}: {
  onSelect: (template: BoardTemplate) => void
  selectedTemplate: BoardTemplate
}) {
  return (
    <div className="board-template-grid">
      {boardTemplateOptions.map((template) => (
        <button
          className={selectedTemplate === template.value
            ? 'board-template-card active'
            : 'board-template-card'}
          key={template.value}
          onClick={() => onSelect(template.value)}
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
  )
}

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
  const [newScreenTemplate, setNewScreenTemplate] = useState<BoardTemplate>(defaultBoardTemplate)
  const [promoMedia, setPromoMedia] = useState<BoardPromoMedia>({})
  const [promoVideoUrl, setPromoVideoUrl] = useState('')
  const [promoImageUrl, setPromoImageUrl] = useState('')
  const [promoMediaError, setPromoMediaError] = useState<string | null>(null)
  const [videoPreviewFailed, setVideoPreviewFailed] = useState(false)
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false)

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

  useEffect(() => {
    if (!draftProfile) {
      setPromoMedia({})
      setPromoVideoUrl('')
      setPromoImageUrl('')
      setPromoMediaError(null)
      setVideoPreviewFailed(false)
      setImagePreviewFailed(false)
      return
    }

    const nextPromoMedia = boardPromoMediaService.getMedia(draftProfile.id)

    setPromoMedia(nextPromoMedia)
    setPromoVideoUrl(getBoardPromoUrlInputValue(nextPromoMedia.videoUrl))
    setPromoImageUrl(getBoardPromoUrlInputValue(nextPromoMedia.imageUrl))
    setPromoMediaError(null)
    setVideoPreviewFailed(false)
    setImagePreviewFailed(false)
  }, [draftProfile?.id])

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
    let nextPromoMedia = boardPromoMediaService.getMedia(draftProfile.id)
    const savedVideoUrl = getBoardPromoUrlInputValue(nextPromoMedia.videoUrl)
    const savedImageUrl = getBoardPromoUrlInputValue(nextPromoMedia.imageUrl)

    if (promoVideoUrl.trim() !== savedVideoUrl) {
      nextPromoMedia = boardPromoMediaService.saveVideoUrl(draftProfile.id, promoVideoUrl)
    }
    if (promoImageUrl.trim() !== savedImageUrl) {
      nextPromoMedia = boardPromoMediaService.saveImageUrl(draftProfile.id, promoImageUrl)
    }

    setBoardSettings(savedSettings)
    setPromoMedia(nextPromoMedia)
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
    const screenId = String(Date.now())
    const screenProfileId = `screen-${screenId}`
    const screenBoardType = roomIds.length === 1 ? 'individual' : 'general'
    const newScreens = [
      ...boardSettings.screens,
      { id: screenId, name: newScreenName.trim(), roomIds, roomNames: newScreenRooms },
    ]
    const newProfile: BoardSettingsProfile = {
      boardType: screenBoardType,
      id: screenProfileId,
      name: newScreenName.trim(),
      recentCallsLimit: boardSettings.recentCallsLimit,
      roomBoardId: screenBoardType === 'individual' ? roomIds[0] : '',
      showRecentCalls: boardSettings.showRecentCalls,
      showTime: boardSettings.showTime,
      template: newScreenTemplate,
      voiceEnabled: boardSettings.voiceEnabled,
    }

    await updateBoardSettings({
      profiles: [...(boardSettings.profiles ?? []), newProfile],
      screens: newScreens,
    })
    setNewScreenName('')
    setNewScreenRooms([])
    setNewScreenTemplate(defaultBoardTemplate)
  }

  async function deleteScreen(id: string) {
    await updateBoardSettings({
      screens: boardSettings.screens.filter((screen) => screen.id !== id),
    })
  }

  function updateVoiceSettings(nextSettings: Partial<VoiceSettings>) {
    setVoiceSettings((current) => voiceSettingsService.saveSettings({ ...current, ...nextSettings }))
  }

  function getPromoMediaErrorMessage(promoError: unknown): string {
    return promoError instanceof Error
      ? promoError.message
      : 'Не удалось сохранить промо-медиа'
  }

  function savePromoImageUrl() {
    if (!draftProfile) return

    try {
      const nextPromoMedia = boardPromoMediaService.saveImageUrl(draftProfile.id, promoImageUrl)

      setPromoMedia(nextPromoMedia)
      setPromoImageUrl(getBoardPromoUrlInputValue(nextPromoMedia.imageUrl))
      setPromoMediaError(null)
      setImagePreviewFailed(false)
    } catch (promoError) {
      setPromoMediaError(getPromoMediaErrorMessage(promoError))
    }
  }

  function savePromoVideoUrl() {
    if (!draftProfile) return

    try {
      const nextPromoMedia = boardPromoMediaService.saveVideoUrl(draftProfile.id, promoVideoUrl)

      setPromoMedia(nextPromoMedia)
      setPromoVideoUrl(getBoardPromoUrlInputValue(nextPromoMedia.videoUrl))
      setPromoMediaError(null)
      setVideoPreviewFailed(false)
    } catch (promoError) {
      setPromoMediaError(getPromoMediaErrorMessage(promoError))
    }
  }

  async function uploadPromoImage(event: ChangeEvent<HTMLInputElement>) {
    if (!draftProfile) return

    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    try {
      const nextPromoMedia = await boardPromoMediaService.uploadImageFile(draftProfile.id, file)

      setPromoMedia(nextPromoMedia)
      setPromoImageUrl(getBoardPromoUrlInputValue(nextPromoMedia.imageUrl))
      setPromoMediaError(null)
      setImagePreviewFailed(false)
    } catch (promoError) {
      setPromoMediaError(getPromoMediaErrorMessage(promoError))
    }
  }

  async function uploadPromoVideo(event: ChangeEvent<HTMLInputElement>) {
    if (!draftProfile) return

    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    try {
      const nextPromoMedia = await boardPromoMediaService.uploadVideoFile(draftProfile.id, file)

      setPromoMedia(nextPromoMedia)
      setPromoVideoUrl(getBoardPromoUrlInputValue(nextPromoMedia.videoUrl))
      setPromoMediaError(null)
      setVideoPreviewFailed(false)
    } catch (promoError) {
      setPromoMediaError(getPromoMediaErrorMessage(promoError))
    }
  }

  function removePromoImage() {
    if (!draftProfile) return

    const nextPromoMedia = boardPromoMediaService.removeImage(draftProfile.id)

    setPromoMedia(nextPromoMedia)
    setPromoImageUrl('')
    setPromoMediaError(null)
    setImagePreviewFailed(false)
  }

  function removePromoVideo() {
    if (!draftProfile) return

    const nextPromoMedia = boardPromoMediaService.removeVideo(draftProfile.id)

    setPromoMedia(nextPromoMedia)
    setPromoVideoUrl('')
    setPromoMediaError(null)
    setVideoPreviewFailed(false)
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
              <BoardTemplateSelector
                onSelect={(template) => updateDraftProfile({ template })}
                selectedTemplate={draftProfile.template}
              />
            </fieldset>

            {draftProfile.template === 'video_queue' ? (
              <fieldset className="admin-checkbox-group promo-media-settings">
                <legend>Промо-видео</legend>

                {promoMediaError ? <div className="modal-error">{promoMediaError}</div> : null}

                <label className="field">
                  <span>URL на видео</span>
                  <input
                    onChange={(event) => setPromoVideoUrl(event.target.value)}
                    placeholder="https://example.com/promo.mp4"
                    value={promoVideoUrl}
                  />
                </label>

                <div className="button-row">
                  <Button
                    icon={<Video size={14} />}
                    onClick={savePromoVideoUrl}
                    size="sm"
                    variant="secondary"
                  >
                    Сохранить URL
                  </Button>
                  <label className="button button-secondary button-sm promo-upload-button">
                    <span className="button-icon"><Upload size={14} /></span>
                    <span>Загрузить mp4</span>
                    <input
                      accept="video/mp4"
                      onChange={(event) => void uploadPromoVideo(event)}
                      type="file"
                    />
                  </label>
                  <Button
                    disabled={!promoMedia.videoUrl}
                    icon={<Trash2 size={14} />}
                    onClick={removePromoVideo}
                    size="sm"
                    variant="danger"
                  >
                    Удалить видео
                  </Button>
                </div>

                {promoMedia.videoUrl && !videoPreviewFailed ? (
                  <div className="promo-media-preview">
                    <video
                      controls
                      muted
                      onError={() => setVideoPreviewFailed(true)}
                      playsInline
                      src={promoMedia.videoUrl}
                    />
                    <small>{promoMedia.videoName ?? 'Промо-видео'}</small>
                  </div>
                ) : promoMedia.videoUrl ? (
                  <div className="promo-media-empty">Не удалось загрузить превью видео</div>
                ) : (
                  <div className="promo-media-empty">Видео не задано</div>
                )}

                <label className="field">
                  <span>Промо-изображение fallback</span>
                  <input
                    onChange={(event) => setPromoImageUrl(event.target.value)}
                    placeholder="https://example.com/image.jpg"
                    value={promoImageUrl}
                  />
                </label>

                <div className="button-row">
                  <Button
                    icon={<ImageIcon size={14} />}
                    onClick={savePromoImageUrl}
                    size="sm"
                    variant="secondary"
                  >
                    Сохранить изображение
                  </Button>
                  <label className="button button-secondary button-sm promo-upload-button">
                    <span className="button-icon"><Upload size={14} /></span>
                    <span>Загрузить изображение</span>
                    <input
                      accept="image/*"
                      onChange={(event) => void uploadPromoImage(event)}
                      type="file"
                    />
                  </label>
                  <Button
                    disabled={!promoMedia.imageUrl}
                    icon={<Trash2 size={14} />}
                    onClick={removePromoImage}
                    size="sm"
                    variant="danger"
                  >
                    Удалить изображение
                  </Button>
                </div>

                {promoMedia.imageUrl && !imagePreviewFailed ? (
                  <div className="promo-media-preview">
                    <img
                      alt="Превью промо-изображения"
                      onError={() => setImagePreviewFailed(true)}
                      src={promoMedia.imageUrl}
                    />
                    <small>{promoMedia.imageName ?? 'Промо-изображение'}</small>
                  </div>
                ) : promoMedia.imageUrl ? (
                  <div className="promo-media-empty">Не удалось загрузить превью изображения</div>
                ) : (
                  <div className="promo-media-empty">Изображение не задано</div>
                )}
              </fieldset>
            ) : null}

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

            <fieldset className="admin-checkbox-group">
              <legend>Вид табло</legend>
              <BoardTemplateSelector
                onSelect={setNewScreenTemplate}
                selectedTemplate={newScreenTemplate}
              />
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
