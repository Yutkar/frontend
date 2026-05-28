import { userService } from '@services/userService'
import type { Role, User } from '@shared/types'

const defaultUser: User = {
  id: '',
  name: '',
  role: 'manager',
  department: '',
  avatarInitials: 'SQ',
}

function getAvatarInitials(name: string): string {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || 'SQ'
}

function toSharedUser(user: Awaited<ReturnType<typeof userService.getCurrentUser>>): User {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    department: '',
    avatarInitials: getAvatarInitials(user.name),
  }
}

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

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await userService.login(email, password)

      return toSharedUser(response.user)
    } catch (error) {
      console.error('authApi.login failed', error)
      throw error
    }
  },

  async register(
    name: string,
    email: string,
    password: string,
    role: Role,
  ): Promise<User> {
    try {
      const response = await userService.register(name, email, password, role)

      return toSharedUser(response.user)
    } catch (error) {
      console.error('authApi.register failed', error)
      throw error
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const user = await userService.getCurrentUser()

      return toSharedUser(user)
    } catch (error) {
      console.error('authApi.getCurrentUser failed', error)
      throw error
    }
  },

  async loginAsRole(_role: Role): Promise<User> {
    try {
      const user = await userService.getCurrentUser()

      return toSharedUser(user)
    } catch (error) {
      console.error('authApi.loginAsRole failed', error)
      throw error
    }
  },
}
