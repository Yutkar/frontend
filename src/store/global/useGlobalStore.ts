import { create } from 'zustand'
import { authApi } from '@services/api'
import type { Role, ThemeMode, User } from '@shared/types'

type GlobalState = {
  user: User
  theme: ThemeMode
  sidebarCollapsed: boolean
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  loginAsRole: (role: Role) => Promise<void>
  logout: () => void
  initializeAuth: () => void
}

export const useGlobalStore = create<GlobalState>((set) => ({   // ← убрали get
  user: authApi.getDefaultUser(),
  theme: 'light',
  sidebarCollapsed: false,

  setTheme: (theme) => set({ theme }),
  
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  loginAsRole: async (role) => {
    const user = await authApi.loginAsRole(role)
    set({ user })
    localStorage.setItem('currentUser', JSON.stringify(user))
  },

  logout: () => {
    const defaultUser = authApi.getDefaultUser()
    set({ user: defaultUser })
    localStorage.removeItem('currentUser')
  },

  initializeAuth: () => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        set({ user })
      } catch (e) {
        console.error('Failed to parse saved user')
      }
    }
  },
}))