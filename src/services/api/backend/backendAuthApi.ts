import type { Role, User } from '@shared/types'
import { apiClient } from '../client'
import type { AuthApi } from '../types'

type BackendAuthResponse = {
  access_token?: string
  accessToken?: string
  role?: Role
  token?: string
  user?: Partial<User> & { role?: Role }
}

const roleDefaults: Record<Role, Pick<User, 'avatarInitials' | 'department' | 'name'>> = {
  admin: {
    avatarInitials: 'AD',
    department: 'Administration',
    name: 'Administrator',
  },
  manager: {
    avatarInitials: 'MG',
    department: 'Queue management',
    name: 'Manager',
  },
  specialist: {
    avatarInitials: 'SP',
    department: 'Consultation',
    name: 'Specialist',
  },
}

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'manager' || value === 'specialist'
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

function getToken(response: BackendAuthResponse): string | undefined {
  return response.access_token ?? response.accessToken ?? response.token
}

function toUser(response: BackendAuthResponse, email?: string, name?: string): User {
  const role = isRole(response.user?.role) ? response.user.role : response.role
  const resolvedRole = isRole(role) ? role : 'manager'
  const defaults = roleDefaults[resolvedRole]
  const resolvedName = response.user?.name ?? name ?? defaults.name

  return {
    id: String(response.user?.id ?? email ?? resolvedRole),
    name: resolvedName,
    role: resolvedRole,
    department: response.user?.department ?? defaults.department,
    roomId: response.user?.roomId,
    avatarInitials: response.user?.avatarInitials ?? getAvatarInitials(resolvedName),
  }
}

function readStoredUser(): User | null {
  const savedUser = localStorage.getItem('currentUser')

  if (!savedUser) {
    return null
  }

  try {
    return JSON.parse(savedUser) as User
  } catch {
    return null
  }
}

function persistSession(response: BackendAuthResponse, user: User): void {
  const token = getToken(response)

  if (token) {
    localStorage.setItem('access_token', token)
  }

  localStorage.setItem('currentUser', JSON.stringify(user))
}

export const backendAuthApi: AuthApi = {
  getDefaultUser(): User | null {
    return null
  },

  getCurrentUser(): Promise<User | null> {
    return Promise.resolve(readStoredUser())
  },

  async login(email: string, password: string): Promise<User> {
    const response = await apiClient.post<BackendAuthResponse>('/auth/login', { email, password })
    const user = toUser(response.data, email)

    persistSession(response.data, user)

    return user
  },

  async register(name: string, email: string, password: string, role: Role): Promise<User> {
    const response = await apiClient.post<BackendAuthResponse>('/auth/register', {
      email,
      name,
      password,
      role,
    })
    const user = toUser(response.data, email, name)

    persistSession(response.data, user)

    return user
  },

  async resetPassword(email: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { email })
  },

  async loginAsRole(_role: Role): Promise<User> {
    throw new Error('Role switching is available only in mock API mode.')
  },

  logout(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('currentUser')
  },
}
