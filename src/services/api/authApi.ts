import { mockCredentials, mockStoredUsers, mockUsers, normalizeUserEmail, registerUser } from '@mock/auth.mock'
import type { Role, User } from '@shared/types'
import { resolveMockApi } from './client'

export const authApi = {
  getDefaultUser(): User | null {
    return null
  },

  async login(email: string, password: string): Promise<User> {
    const normalizedEmail = normalizeUserEmail(email)
    const storedPassword = mockCredentials[normalizedEmail]

    if (!storedPassword || storedPassword !== password) {
      throw new Error('Неверный email или пароль.')
    }

    const user = mockStoredUsers[normalizedEmail]
    if (!user) {
      throw new Error('Пользователь не найден.')
    }

    return resolveMockApi(user, 120)
  },

  async register(name: string, email: string, password: string, role: Role): Promise<User> {
    const user = registerUser(name, email, password, role)
    return resolveMockApi(user, 120)
  },

  async resetPassword(email: string): Promise<void> {
    await resolveMockApi(undefined, 120)
  },

  async loginAsRole(role: Role): Promise<User> {
    return resolveMockApi(mockUsers[role], 120)
  },
}
