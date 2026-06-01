import { create } from 'zustand'
import { authApi } from '@services/api'
import type { Role, ThemeMode, User } from '@shared/types'

const themeStorageKey = 'smartq-theme'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(themeStorageKey)

  return savedTheme === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
  window.localStorage.setItem(themeStorageKey, theme)
}

type GlobalState = {
  user: User | null
  theme: ThemeMode
  sidebarCollapsed: boolean
  initialized: boolean
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role: Role) => Promise<void>
  loginAsRole: (role: Role) => Promise<void>
  logout: () => void
  initializeAuth: () => Promise<void>
}

export const useGlobalStore = create<GlobalState>((set) => ({
  user: null,
  theme: getInitialTheme(),
  sidebarCollapsed: false,
  initialized: false,

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  login: async (email, password) => {
    const user = await authApi.login(email, password)
    set({ initialized: true, user })
    localStorage.setItem('currentUser', JSON.stringify(user))
  },

  register: async (name, email, password, role) => {
    const user = await authApi.register(name, email, password, role)
    set({ initialized: true, user })
    localStorage.setItem('currentUser', JSON.stringify(user))
  },

  loginAsRole: async (role) => {
    const user = await authApi.loginAsRole(role)
    set({ initialized: true, user })
    localStorage.setItem('currentUser', JSON.stringify(user))
  },

  logout: () => {
    authApi.logout()
    set({ initialized: true, user: null })
    localStorage.removeItem('currentUser')
  },

  initializeAuth: async () => {
    try {
      const savedUser = localStorage.getItem('currentUser')
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          set({ user })
        } catch (error) {
          console.error('Failed to parse saved user', error)
        }
      }

      const user = await authApi.getCurrentUser()

      if (user) {
        set({ user })
        localStorage.setItem('currentUser', JSON.stringify(user))
      }
    } catch (error) {
      console.error('Failed to initialize auth session', error)
    } finally {
      set({ initialized: true })
    }
  },
}))
