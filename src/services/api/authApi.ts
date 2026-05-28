import { userService } from '@services/userService'
import type { Role, User } from '@shared/types'
import { apiClient } from './client'

const roleDefaults: Record<Role, Pick<User, 'department' | 'name' | 'roomId'>> = {
  admin: {
    department: 'Администрирование',
    name: 'Администратор',
  },
  manager: {
    department: 'Управление очередью',
    name: 'Менеджер',
  },
  specialist: {
    department: 'consultation',
    name: 'Специалист',
    roomId: '1',
  },
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

function toUser(role: Role, email?: string, name?: string): User {
  const defaults = roleDefaults[role]
  const resolvedName = name || defaults.name

  return {
    id: email ?? role,
    name: resolvedName,
    role,
    department: defaults.department,
    roomId: defaults.roomId,
    avatarInitials: getAvatarInitials(resolvedName),
  }
}

export const authApi = {
  getDefaultUser(): User | null {
    return null
  },

  async login(email: string, password: string): Promise<User> {
    try {
      const response = await userService.login(email, password)

      return toUser(response.role, email)
    } catch (error) {
      console.error('authApi.login failed', error)
      throw error
    }
  },

  async register(name: string, email: string, password: string, role: Role): Promise<User> {
    try {
      const response = await userService.register(name, email, password, role)

      return toUser(response.role, email, name)
    } catch (error) {
      console.error('authApi.register failed', error)
      throw error
    }
  },

  async resetPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', { email })
    } catch (error) {
      console.error('authApi.resetPassword failed', error)
      throw error
    }
  },

  async loginAsRole(_role: Role): Promise<User> {
    const error = new Error('Переключение ролей недоступно при подключении к backend.')

    console.error('authApi.loginAsRole failed', error)
    throw error
  },
}
