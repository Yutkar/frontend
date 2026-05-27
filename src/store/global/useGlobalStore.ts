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
}

export const useGlobalStore = create<GlobalState>((set) => ({
  user: authApi.getDefaultUser(),
  theme: 'light',
  sidebarCollapsed: false,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),
  loginAsRole: async (role) => {
    const user = await authApi.loginAsRole(role)

    set({ user })
  },
}))
