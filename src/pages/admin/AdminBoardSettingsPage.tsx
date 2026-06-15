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
  validateBoardVideoUrl,
  type BoardPromoMedia,
} from '@services/boardPromoMediaService'
import {
  boardFontOptions,
  boardScreenFormatOptions,
  boardStyleSettingsService,
  defaultBoardStyleSettings,
  type BoardFontFamily,
  type BoardScreenFormat,
  type BoardStyleSettings,
} from '@services/boardStyleSettingsService'
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

type BoardColorSettingKey = Exclude<
  keyof BoardStyleSettings,
  'fontFamily' | 'fontScalePercent' | 'screenFormat'
>

const boardColorFields: Array<{ key: BoardColorSettingKey; label: string }> = [
  { key: 'boardBackground', label: 'Цвет фона табло' },
  { key: 'currentCallBackground', label: 'Цвет фона текущего вызова' },
  { key: 'currentCallText', label: 'Цвет текста текущего вызова' },
  { key: 'historyBackground', label: 'Цвет фона истории' },
  { key: 'historyText', label: 'Цвет текста истории' },
  { key: 'borderColor', label: 'Цвет рамок/разделителей' },
  { key: 'accentColor', label: 'Цвет акцента' },
]

const boardHexColorPattern = /^#[0-9a-f]{6}$/i

function BoardFontScaleField({
  onChange,
  value,
}: {
  onChange: (value: number) => void
  value: number
}) {
  const [inputValue, setInputValue] = useState(String(value))
  const numericValue = inputValue.trim() ? Number(inputValue) : Number.NaN
  const inputInvalid = !Number.isFinite(numericValue) || numericValue < 50 || numericValue > 300

  return (
    <label className="field board-font-scale-field">
      <span>Размер шрифта, %</span>
      <div className="board-font-scale-control">
        <input
          aria-invalid={inputInvalid}
          className="board-font-scale-input"
          max={300}
          min={50}
          onBlur={() => {
            const normalizedValue = Number.isFinite(numericValue)
              ? Math.min(300, Math.max(50, Math.round(numericValue)))
              : value

            setInputValue(String(normalizedValue))
            onChange(normalizedValue)
          }}
          onChange={(event) => {
            const nextInputValue = event.currentTarget.value
            const nextNumericValue = Number(nextInputValue)

            setInputValue(nextInputValue)
            if (
              nextInputValue
              && Number.isFinite(nextNumericValue)
              && nextNumericValue >= 50
              && nextNumericValue <= 300
            ) {
              onChange(Math.round(nextNumericValue))
            }
          }}
          step={5}
          type="number"
          value={inputValue}
        />
        <span aria-hidden="true">%</span>
      </div>
      {inputInvalid ? (
        <small className="field-error">Введите значение от 50 до 300</small>
      ) : null}
      <small className="field-help">100% — стандартный размер, допустимо от 50% до 300%.</small>
    </label>
  )
}

function BoardColorField({
  colorKey,
  label,
  onChange,
  value,
}: {
  colorKey: BoardColorSettingKey
  label: string
  onChange: (value: string) => void
  value: string
}) {
  const [hexValue, setHexValue] = useState(value.toUpperCase())
  const [hexError, setHexError] = useState('')
  const inputId = `board-color-${colorKey}`

  return (
    <div className="board-color-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="board-color-controls">
        <input
          aria-label={label}
          id={inputId}
          onChange={(event) => {
            const nextValue = event.currentTarget.value

            setHexValue(nextValue.toUpperCase())
            setHexError('')
            onChange(nextValue)
          }}
          type="color"
          value={value}
        />
        <input
          aria-label={`${label}, HEX`}
          className="board-color-hex-input"
          maxLength={7}
          onBlur={() => {
            if (!boardHexColorPattern.test(hexValue.trim())) {
              setHexError('Введите цвет в формате #RRGGBB')
            }
          }}
          onChange={(event) => {
            const nextValue = event.currentTarget.value

            setHexValue(nextValue)
            if (boardHexColorPattern.test(nextValue.trim())) {
              setHexError('')
              onChange(nextValue.trim())
            } else {
              setHexError('Введите цвет в формате #RRGGBB')
            }
          }}
          aria-invalid={Boolean(hexError)}
          pattern="#[0-9a-fA-F]{6}"
          spellCheck={false}
          type="text"
          value={hexValue}
        />
      </div>
      {hexError ? <small className="field-error">{hexError}</small> : null}
    </div>
  )
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

function BoardScreenFormatSelector({
  onSelect,
  selectedFormat,
}: {
  onSelect: (format: BoardScreenFormat) => void
  selectedFormat: BoardScreenFormat
}) {
  return (
    <div className="board-format-selector">
      {boardScreenFormatOptions.map((option) => (
        <button
          className={selectedFormat === option.value
            ? 'board-format-card active'
            : 'board-format-card'}
          key={option.value}
          onClick={() => onSelect(option.value)}
          type="button"
        >
          <span
            aria-hidden="true"
            className={`board-format-preview board-format-preview-${option.value.replace(':', '-')}`}
          >
            <i />
            <i />
          </span>
          <strong>{option.label}</strong>
          <small>{option.label} — {option.description.toLowerCase()}</small>
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
  const [newScreenFormat, setNewScreenFormat] = useState<BoardScreenFormat>('16:9')
  const [newScreenVideoUrl, setNewScreenVideoUrl] = useState('')
  const [newScreenVideoPreviewFailed, setNewScreenVideoPreviewFailed] = useState(false)
  const [promoMedia, setPromoMedia] = useState<BoardPromoMedia>({})
  const [boardStyleSettings, setBoardStyleSettings] = useState<BoardStyleSettings>(defaultBoardStyleSettings)
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
      setBoardStyleSettings(defaultBoardStyleSettings)
      setPromoVideoUrl('')
      setPromoImageUrl('')
      setPromoMediaError(null)
      setVideoPreviewFailed(false)
      setImagePreviewFailed(false)
      return
    }

    const nextPromoMedia = boardPromoMediaService.getMedia(draftProfile.id)

    setPromoMedia(nextPromoMedia)
    setBoardStyleSettings(boardStyleSettingsService.getSettings(draftProfile.id))
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
    setBoardStyleSettings(boardStyleSettingsService.getSettings(profile.id))
    setDraftProfile(profile)
  }

  function updateDraftProfile(nextProfile: Partial<BoardSettingsProfile>) {
    setDraftProfile((current: BoardSettingsProfile | null) => current ? { ...current, ...nextProfile } : current)
  }

  function updateBoardStyleSettings(nextSettings: Partial<BoardStyleSettings>) {
    setBoardStyleSettings((current) => ({ ...current, ...nextSettings }))
  }

  function cancelEditProfile() {
    setDraftProfile(null)
  }

  async function saveDraftProfile() {
    if (!draftProfile) return

    const videoUrlValidation = validateBoardVideoUrl(promoVideoUrl)

    if (draftProfile.template === 'video_queue' && !videoUrlValidation.valid) {
      return
    }

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
    setBoardStyleSettings(boardStyleSettingsService.saveSettings(draftProfile.id, boardStyleSettings))
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

    const videoUrlValidation = validateBoardVideoUrl(newScreenVideoUrl)

    if (newScreenTemplate === 'video_queue' && !videoUrlValidation.valid) {
      return
    }

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
    if (newScreenTemplate === 'video_queue' && videoUrlValidation.normalizedUrl) {
      boardPromoMediaService.saveVideoUrl(screenProfileId, videoUrlValidation.normalizedUrl)
    }
    boardStyleSettingsService.saveSettings(screenProfileId, {
      ...defaultBoardStyleSettings,
      screenFormat: newScreenFormat,
    })
    setNewScreenName('')
    setNewScreenRooms([])
    setNewScreenTemplate(defaultBoardTemplate)
    setNewScreenFormat('16:9')
    setNewScreenVideoUrl('')
    setNewScreenVideoPreviewFailed(false)
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
  const promoVideoUrlValidation = validateBoardVideoUrl(promoVideoUrl)
  const newScreenVideoUrlValidation = validateBoardVideoUrl(newScreenVideoUrl)
  const storedVideoUploadUrl = promoMedia.videoUrl && !getBoardPromoUrlInputValue(promoMedia.videoUrl)
    ? promoMedia.videoUrl
    : ''
  const promoVideoPreviewUrl = promoVideoUrlValidation.valid
    ? promoVideoUrlValidation.normalizedUrl || storedVideoUploadUrl
    : ''
  const newScreenVideoPreviewUrl = newScreenVideoUrlValidation.valid
    ? newScreenVideoUrlValidation.normalizedUrl
    : ''
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

            <fieldset className="admin-checkbox-group board-screen-format-settings">
              <legend>Формат экрана</legend>
              <BoardScreenFormatSelector
                onSelect={(screenFormat) => updateBoardStyleSettings({ screenFormat })}
                selectedFormat={boardStyleSettings.screenFormat}
              />
            </fieldset>

            <fieldset className="admin-checkbox-group board-style-settings">
              <legend>Внешний вид табло</legend>

              <div className="board-typography-settings">
                <label className="field">
                  <span>Шрифт табло</span>
                  <select
                    onChange={(event) => updateBoardStyleSettings({
                      fontFamily: event.target.value as BoardFontFamily,
                    })}
                    value={boardStyleSettings.fontFamily}
                  >
                    {boardFontOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <BoardFontScaleField
                  key={draftProfile.id}
                  onChange={(fontScalePercent) => updateBoardStyleSettings({ fontScalePercent })}
                  value={boardStyleSettings.fontScalePercent}
                />
              </div>

              <div className="board-color-settings-grid">
                {boardColorFields.map((field) => (
                  <BoardColorField
                    colorKey={field.key}
                    key={`${draftProfile.id}-${field.key}`}
                    label={field.label}
                    onChange={(value) => updateBoardStyleSettings({ [field.key]: value })}
                    value={boardStyleSettings[field.key]}
                  />
                ))}
              </div>
            </fieldset>

            {draftProfile.template === 'video_queue' ? (
              <fieldset className="admin-checkbox-group promo-media-settings">
                <legend>Промо-видео</legend>

                {promoMediaError ? <div className="modal-error">{promoMediaError}</div> : null}

                <label className="field">
                  <span>Ссылка на видео</span>
                  <input
                    aria-invalid={!promoVideoUrlValidation.valid}
                    onChange={(event) => {
                      setPromoVideoUrl(event.target.value)
                      setPromoMediaError(null)
                      setVideoPreviewFailed(false)
                    }}
                    placeholder="https://example.com/video.mp4"
                    type="url"
                    value={promoVideoUrl}
                  />
                  <small className="field-help">Поддерживаются прямые ссылки на mp4/webm/ogg</small>
                  {!promoVideoUrlValidation.valid ? (
                    <small className="field-error">{promoVideoUrlValidation.error}</small>
                  ) : null}
                </label>

                <div className="button-row">
                  <Button
                    disabled={!promoVideoUrlValidation.valid}
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
                    disabled={!promoVideoUrl.trim() && !promoMedia.videoUrl}
                    icon={<X size={14} />}
                    onClick={removePromoVideo}
                    size="sm"
                    variant="secondary"
                  >
                    Очистить ссылку
                  </Button>
                </div>

                {promoVideoPreviewUrl && !videoPreviewFailed ? (
                  <div className="promo-media-preview">
                    <video
                      controls
                      muted
                      onError={() => setVideoPreviewFailed(true)}
                      onLoadedData={() => setVideoPreviewFailed(false)}
                      playsInline
                      src={promoVideoPreviewUrl}
                    />
                    <small>{promoMedia.videoName ?? 'Промо-видео'}</small>
                  </div>
                ) : promoVideoPreviewUrl ? (
                  <div className="promo-media-empty">Видео не удалось загрузить</div>
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
              <span>Количество строк истории</span>
              <input
                disabled={!draftProfile.showRecentCalls}
                onChange={(event) => updateDraftProfile({
                  recentCallsLimit: Math.min(30, Math.max(0, Number(event.target.value))),
                })}
                max={30}
                min={0}
                step={1}
                type="number"
                value={draftProfile.recentCallsLimit}
              />
              <small className="field-help">От 0 до 30. При значении 0 история скрыта.</small>
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
                disabled={
                  !draftProfile.name.trim()
                  || (draftProfile.boardType === 'individual' && !draftProfile.roomBoardId)
                  || (draftProfile.template === 'video_queue' && !promoVideoUrlValidation.valid)
                }
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
                onSelect={(template) => {
                  setNewScreenTemplate(template)
                  setNewScreenVideoPreviewFailed(false)
                }}
                selectedTemplate={newScreenTemplate}
              />
            </fieldset>

            <fieldset className="admin-checkbox-group board-screen-format-settings">
              <legend>Формат экрана</legend>
              <BoardScreenFormatSelector
                onSelect={setNewScreenFormat}
                selectedFormat={newScreenFormat}
              />
            </fieldset>

            {newScreenTemplate === 'video_queue' ? (
              <fieldset className="admin-checkbox-group promo-media-settings">
                <legend>Промо-видео</legend>

                <label className="field">
                  <span>Ссылка на видео</span>
                  <input
                    aria-invalid={!newScreenVideoUrlValidation.valid}
                    onChange={(event) => {
                      setNewScreenVideoUrl(event.target.value)
                      setNewScreenVideoPreviewFailed(false)
                    }}
                    placeholder="https://example.com/video.mp4"
                    type="url"
                    value={newScreenVideoUrl}
                  />
                  <small className="field-help">Поддерживаются прямые ссылки на mp4/webm/ogg</small>
                  {!newScreenVideoUrlValidation.valid ? (
                    <small className="field-error">{newScreenVideoUrlValidation.error}</small>
                  ) : null}
                </label>

                <div className="button-row">
                  <Button
                    disabled={!newScreenVideoUrl}
                    icon={<X size={14} />}
                    onClick={() => {
                      setNewScreenVideoUrl('')
                      setNewScreenVideoPreviewFailed(false)
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    Очистить ссылку
                  </Button>
                </div>

                {newScreenVideoPreviewUrl && !newScreenVideoPreviewFailed ? (
                  <div className="promo-media-preview">
                    <video
                      controls
                      muted
                      onError={() => setNewScreenVideoPreviewFailed(true)}
                      onLoadedData={() => setNewScreenVideoPreviewFailed(false)}
                      playsInline
                      src={newScreenVideoPreviewUrl}
                    />
                    <small>Предпросмотр видео</small>
                  </div>
                ) : newScreenVideoPreviewUrl ? (
                  <div className="promo-media-empty">Видео не удалось загрузить</div>
                ) : (
                  <div className="promo-media-empty">Видео не задано</div>
                )}
              </fieldset>
            ) : null}

            <div className="modal-actions">
              <Button
                disabled={
                  !newScreenName.trim()
                  || newScreenRooms.length === 0
                  || (newScreenTemplate === 'video_queue' && !newScreenVideoUrlValidation.valid)
                }
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
