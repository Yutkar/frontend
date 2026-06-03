import type { Role, User } from '@shared/types'
import { apiClient } from '../client'
import type { AuthApi } from '../types'

type BackendUser = {
  assignedRoomId?: number | string | null
  avatarInitials?: string
  department?: string
  id?: number | string
  name?: string
  role?: Role
  room?: {
    id?: number | string | null
  } | null
  roomId?: number | string | null
}

type BackendAuthResponse = BackendUser & {
  access_token?: string
  accessToken?: string
  token?: string
  user?: BackendUser
}

type BackendMeEnvelope = {
  user?: BackendUser
}

type BackendMeResponse = BackendUser | BackendMeEnvelope

const roleDefaults: Record<Role, Pick<User, 'avatarInitials' | 'department' | 'name'>> = {
  admin: {
    avatarInitials: 'AD',
    department: 'Администрирование',
    name: 'Администратор',
  },
  manager: {
    avatarInitials: 'MG',
    department: 'Управление очередью',
    name: 'Менеджер',
  },
  specialist: {
    avatarInitials: 'SP',
    department: 'Приём пациентов',
    name: 'Специалист',
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

function getRoomId(user?: BackendUser): string | undefined {
  const roomId = user?.roomId ?? user?.assignedRoomId ?? user?.room?.id

  return roomId == null ? undefined : String(roomId)
}

function toUserFromBackendUser(user: BackendUser, fallbackRole: Role = 'manager'): User {
  const resolvedRole = isRole(user.role) ? user.role : fallbackRole
  const defaults = roleDefaults[resolvedRole]
  const resolvedName = user.name ?? defaults.name

  return {
    id: String(user.id ?? resolvedRole),
    name: resolvedName,
    role: resolvedRole,
    department: user.department ?? defaults.department,
    roomId: getRoomId(user),
    avatarInitials: user.avatarInitials ?? getAvatarInitials(resolvedName),
  }
}

function toUser(response: BackendAuthResponse, email?: string, name?: string): User {
  const backendUser = response.user ?? response
  const role = isRole(backendUser.role) ? backendUser.role : response.role
  const resolvedRole = isRole(role) ? role : 'manager'
  const defaults = roleDefaults[resolvedRole]
  const resolvedName = backendUser.name ?? name ?? defaults.name

  return {
    id: String(backendUser.id ?? email ?? resolvedRole),
    name: resolvedName,
    role: resolvedRole,
    department: backendUser.department ?? defaults.department,
    roomId: getRoomId(backendUser),
    avatarInitials: backendUser.avatarInitials ?? getAvatarInitials(resolvedName),
  }
}

function getMeUser(response: BackendMeResponse): BackendUser {
  return 'user' in response && response.user ? response.user : response as BackendUser
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

function persistUser(user: User): void {
  localStorage.setItem('currentUser', JSON.stringify(user))
}

async function fetchCurrentUser(fallbackRole: Role = 'manager'): Promise<User | null> {
  try {
    const response = await apiClient.get<BackendMeResponse>('/auth/me')
    const user = toUserFromBackendUser(getMeUser(response.data), fallbackRole)

    persistUser(user)

    return user
  } catch (error) {
    console.warn('backendAuthApi.getCurrentUser: /auth/me is not available', error)

    return readStoredUser()
  }
}

export const backendAuthApi: AuthApi = {
  getDefaultUser(): User | null {
    return null
  },

  getCurrentUser(): Promise<User | null> {
    const storedUser = readStoredUser()

    if (!localStorage.getItem('access_token')) {
      return Promise.resolve(storedUser)
    }

    return fetchCurrentUser(storedUser?.role)
  },

  async login(email: string, password: string): Promise<User> {
    const response = await apiClient.post<BackendAuthResponse>('/auth/login', { email, password })
    const fallbackUser = toUser(response.data, email)

    persistSession(response.data, fallbackUser)

    return await fetchCurrentUser(fallbackUser.role) ?? fallbackUser
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
