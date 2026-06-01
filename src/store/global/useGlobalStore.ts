import { create } from 'zustand'
import { authApi } from '@services/api'
import type { Role, ThemeMode, User } from '@shared/types'

type GlobalState = {
  user: User | null
  theme: ThemeMode
  sidebarCollapsed: boolean
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
  theme: 'light',
  sidebarCollapsed: false,

  setTheme: (theme) => set({ theme }),
  
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  login: async (email, password) => {
    const user = await authApi.login(email, password)
    set({ user })
    localStorage.setItem('currentUser', JSON.stringify(user))
  },

  register: async (name, email, password, role) => {
    const user = await authApi.register(name, email, password, role)
    set({ user })
    localStorage.setItem('currentUser', JSON.stringify(user))
  },

  loginAsRole: async (role) => {
    const user = await authApi.loginAsRole(role)
    set({ user })
    localStorage.setItem('currentUser', JSON.stringify(user))
  },

  logout: () => {
    authApi.logout()
    set({ user: null })
    localStorage.removeItem('currentUser')
  },

  initializeAuth: async () => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        set({ user })
      } catch (e) {
        console.error('Failed to parse saved user')
      }
    }

    const user = await authApi.getCurrentUser()

    if (user) {
      set({ user })
      localStorage.setItem('currentUser', JSON.stringify(user))
    }
  },
}))
