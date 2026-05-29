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
  getDefaultUser(): User {
    return defaultUser
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
