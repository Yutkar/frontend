export type BoardFontFamily =
  | 'Inter'
  | 'Arial'
  | 'Roboto'
  | 'Montserrat'
  | 'Open Sans'
  | 'System'

export type BoardScreenFormat = '16:9' | '4:3'

export type BoardStyleSettings = {
  accentColor: string
  boardBackground: string
  borderColor: string
  currentCallBackground: string
  currentCallText: string
  fontFamily: BoardFontFamily
  historyBackground: string
  historyText: string
  screenFormat: BoardScreenFormat
}

export const boardFontOptions: Array<{ label: string; value: BoardFontFamily }> = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'System', value: 'System' },
]

export const boardScreenFormatOptions: Array<{
  description: string
  label: string
  value: BoardScreenFormat
}> = [
  { description: 'Широкий экран', label: '16:9', value: '16:9' },
  { description: 'Квадратный экран', label: '4:3', value: '4:3' },
]

export const defaultBoardStyleSettings: BoardStyleSettings = {
  accentColor: '#1769aa',
  boardBackground: '#f7fbff',
  borderColor: '#cfe1f0',
  currentCallBackground: '#ffffff',
  currentCallText: '#0c3557',
  fontFamily: 'Inter',
  historyBackground: '#ffffff',
  historyText: '#102033',
  screenFormat: '16:9',
}

const boardStyleSettingsStorageKey = 'smartq_board_style_settings'
const defaultProfileId = 'general'
const hexColorPattern = /^#[0-9a-f]{6}$/i
const fontFamilies = new Set<BoardFontFamily>(boardFontOptions.map((option) => option.value))

type BoardStyleStorage = Record<string, Partial<BoardStyleSettings>>

function normalizeProfileId(profileId?: string | null): string {
  const normalizedProfileId = String(profileId ?? '').trim()

  return normalizedProfileId || defaultProfileId
}

function normalizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && hexColorPattern.test(value.trim())
    ? value.trim().toLowerCase()
    : fallback
}

export function normalizeBoardStyleSettings(value?: Partial<BoardStyleSettings> | null): BoardStyleSettings {
  const fontFamily = value?.fontFamily && fontFamilies.has(value.fontFamily)
    ? value.fontFamily
    : defaultBoardStyleSettings.fontFamily
  const screenFormat = value?.screenFormat === '4:3' ? '4:3' : '16:9'

  return {
    accentColor: normalizeColor(value?.accentColor, defaultBoardStyleSettings.accentColor),
    boardBackground: normalizeColor(value?.boardBackground, defaultBoardStyleSettings.boardBackground),
    borderColor: normalizeColor(value?.borderColor, defaultBoardStyleSettings.borderColor),
    currentCallBackground: normalizeColor(
      value?.currentCallBackground,
      defaultBoardStyleSettings.currentCallBackground,
    ),
    currentCallText: normalizeColor(value?.currentCallText, defaultBoardStyleSettings.currentCallText),
    fontFamily,
    historyBackground: normalizeColor(
      value?.historyBackground,
      defaultBoardStyleSettings.historyBackground,
    ),
    historyText: normalizeColor(value?.historyText, defaultBoardStyleSettings.historyText),
    screenFormat,
  }
}

function readStorage(): BoardStyleStorage {
  try {
    const saved = window.localStorage.getItem(boardStyleSettingsStorageKey)
    const parsed = saved ? JSON.parse(saved) : {}

    return parsed && typeof parsed === 'object' ? parsed as BoardStyleStorage : {}
  } catch {
    return {}
  }
}

function writeStorage(storage: BoardStyleStorage): BoardStyleStorage {
  window.localStorage.setItem(boardStyleSettingsStorageKey, JSON.stringify(storage))

  return storage
}

export function getBoardFontStack(fontFamily: BoardFontFamily): string {
  if (fontFamily === 'Arial') return 'Arial, Helvetica, sans-serif'
  if (fontFamily === 'Roboto') return 'Roboto, Arial, sans-serif'
  if (fontFamily === 'Montserrat') return 'Montserrat, Arial, sans-serif'
  if (fontFamily === 'Open Sans') return '"Open Sans", Arial, sans-serif'
  if (fontFamily === 'System') return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

  return 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
}

export const boardStyleSettingsService = {
  getSettings(profileId?: string | null): BoardStyleSettings {
    const storedSettings = readStorage()[normalizeProfileId(profileId)]

    return normalizeBoardStyleSettings(storedSettings)
  },

  saveSettings(
    profileId: string | undefined | null,
    settings: Partial<BoardStyleSettings>,
  ): BoardStyleSettings {
    const normalizedProfileId = normalizeProfileId(profileId)
    const normalizedSettings = normalizeBoardStyleSettings(settings)

    writeStorage({
      ...readStorage(),
      [normalizedProfileId]: normalizedSettings,
    })

    return normalizedSettings
  },
}
