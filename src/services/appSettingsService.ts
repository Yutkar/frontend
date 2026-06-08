import { useSyncExternalStore } from 'react'
import { apiClient } from './api/client'
import { isBackendMode } from './api/apiProvider'

export type AppSettings = {
  appName: string
  logoDataUrl?: string
}

export const appSettingsStorageKey = 'smartq_app_settings'

export const defaultAppSettings: AppSettings = {
  appName: 'SmartQ',
  logoDataUrl: '',
}

let currentSettings = readStoredSettings()
const listeners = new Set<() => void>()

function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') {
    return defaultAppSettings
  }

  const record = value as Partial<AppSettings>
  const appName = typeof record.appName === 'string' && record.appName.trim()
    ? record.appName.trim()
    : defaultAppSettings.appName
  const logoDataUrl = typeof record.logoDataUrl === 'string' ? record.logoDataUrl : ''

  return { appName, logoDataUrl }
}

function readStoredSettings(): AppSettings {
  try {
    const saved = window.localStorage.getItem(appSettingsStorageKey)

    return saved ? normalizeSettings(JSON.parse(saved)) : defaultAppSettings
  } catch {
    return defaultAppSettings
  }
}

function saveStoredSettings(settings: AppSettings): AppSettings {
  const normalizedSettings = normalizeSettings(settings)

  window.localStorage.setItem(appSettingsStorageKey, JSON.stringify(normalizedSettings))

  return normalizedSettings
}

function notifySettingsChanged(settings: AppSettings): AppSettings {
  currentSettings = settings
  listeners.forEach((listener) => listener())

  return currentSettings
}

function getSnapshot(): AppSettings {
  return currentSettings
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function getAppInitials(appName = currentSettings.appName): string {
  return appName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'SQ'
}

export function useAppSettings(): AppSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export const appSettingsService = {
  getSettings(): AppSettings {
    return currentSettings
  },

  async loadSettings(): Promise<AppSettings> {
    if (!isBackendMode) {
      return currentSettings
    }

    try {
      const response = await apiClient.get<unknown>('/app-settings')
      const settings = normalizeSettings(response.data)

      saveStoredSettings(settings)

      return notifySettingsChanged(settings)
    } catch (error) {
      console.warn('appSettingsService.loadSettings: backend endpoint недоступен', error)

      return currentSettings
    }
  },

  async updateSettings(input: AppSettings): Promise<AppSettings> {
    const localSettings = saveStoredSettings(input)

    if (!isBackendMode) {
      return notifySettingsChanged(localSettings)
    }

    try {
      const response = await apiClient.patch<unknown>('/app-settings', localSettings)
      const settings = saveStoredSettings(normalizeSettings(response.data))

      return notifySettingsChanged(settings)
    } catch (error) {
      console.warn('appSettingsService.updateSettings: backend endpoint недоступен, сохраняем локально', error)

      return notifySettingsChanged(localSettings)
    }
  },
}
