export type Role = 'admin' | 'manager' | 'specialist'

export type ThemeMode = 'light' | 'dark'

export type User = {
  id: string
  name: string
  email?: string
  role: Role
  department: string
  roomId?: string
  assignedRoomId?: string
  roomAssignmentPending?: boolean
  avatarInitials: string
}
