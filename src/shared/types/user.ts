export type Role = 'admin' | 'manager' | 'specialist'

export type ThemeMode = 'light' | 'dark'

export type User = {
  id: string
  name: string
  role: Role
  department: string
  roomId?: string
  avatarInitials: string
}
