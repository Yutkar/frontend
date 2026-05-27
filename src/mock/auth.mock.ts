import type { Role, User } from '@shared/types'

export const mockUsers: Record<Role, User> = {
  admin: {
    id: 'user-admin',
    name: 'Дмитрий Орлов',
    role: 'admin',
    department: 'Операционный центр',
    avatarInitials: 'ДО',
  },
  manager: {
    id: 'user-manager',
    name: 'Амина Каримова',
    role: 'manager',
    department: 'Управление очередью',
    avatarInitials: 'АК',
  },
  specialist: {
    id: 'user-specialist',
    name: 'Сергей Волков',
    role: 'specialist',
    department: 'Консультация',
    roomId: 'room-203',
    avatarInitials: 'СВ',
  },
}
