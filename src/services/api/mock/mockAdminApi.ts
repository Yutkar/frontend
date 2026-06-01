import { mockUsers } from '@mock/auth.mock'
import type { User } from '@shared/types'
import type { AdminApi, AdminRecord, AdminRecordInput, AdminUserInput } from '../types'
import { getQueueSnapshot } from './mockState'

let rooms = getQueueSnapshot().rooms.map<AdminRecord>((room) => ({ ...room }))
let staff: AdminRecord[] = [
  {
    department: mockUsers.specialist.department,
    id: mockUsers.specialist.id,
    name: mockUsers.specialist.name,
    role: mockUsers.specialist.role,
    roomId: mockUsers.specialist.roomId,
  },
]
let users = Object.values(mockUsers)

function clone<T>(value: T): T {
  return structuredClone(value)
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
}

function resolveInputId(input: AdminRecordInput, prefix: string): string | number {
  return typeof input.id === 'string' || typeof input.id === 'number' ? input.id : nextId(prefix)
}

function upsertRecord(
  collection: AdminRecord[],
  id: string | number,
  input: AdminRecordInput,
): AdminRecord {
  const index = collection.findIndex((item) => String(item.id) === String(id))

  if (index === -1) {
    throw new Error(`Record ${id} was not found.`)
  }

  collection[index] = {
    ...collection[index],
    ...input,
    id,
  }

  return clone(collection[index])
}

function deleteRecord(collection: AdminRecord[], id: string | number): AdminRecord[] {
  return collection.filter((item) => String(item.id) !== String(id))
}

function createUserRecord(input: AdminUserInput): User {
  const user: User = {
    avatarInitials: input.avatarInitials ?? input.name.slice(0, 2).toUpperCase(),
    department: input.department ?? 'SmartQ',
    id: input.id ?? nextId('user'),
    name: input.name,
    role: input.role,
    roomId: input.roomId,
  }

  users = [...users, user]

  return clone(user)
}

function updateUserRecord(id: string | number, input: Partial<AdminUserInput>): User {
  const index = users.findIndex((user) => String(user.id) === String(id))

  if (index === -1) {
    throw new Error(`User ${id} was not found.`)
  }

  users[index] = {
    ...users[index],
    ...input,
  }

  return clone(users[index])
}

export const mockAdminApi: AdminApi = {
  getRooms() {
    return Promise.resolve(clone(rooms))
  },

  createRoom(input) {
    const room: AdminRecord = {
      ...input,
      id: resolveInputId(input, 'room'),
    }

    rooms = [...rooms, room]

    return Promise.resolve(clone(room))
  },

  updateRoom(id, input) {
    return Promise.resolve(upsertRecord(rooms, id, input))
  },

  deleteRoom(id) {
    rooms = deleteRecord(rooms, id)

    return Promise.resolve()
  },

  getStaff() {
    return Promise.resolve(clone(staff))
  },

  createStaff(input) {
    const staffMember: AdminRecord = {
      ...input,
      id: resolveInputId(input, 'staff'),
    }

    staff = [...staff, staffMember]

    return Promise.resolve(clone(staffMember))
  },

  updateStaff(id, input) {
    return Promise.resolve(upsertRecord(staff, id, input))
  },

  deleteStaff(id) {
    staff = deleteRecord(staff, id)

    return Promise.resolve()
  },

  getUsers() {
    return Promise.resolve(clone(users))
  },

  createUser(input) {
    return Promise.resolve(createUserRecord(input))
  },

  updateUser(id, input) {
    return Promise.resolve(updateUserRecord(id, input))
  },

  deleteUser(id) {
    users = users.filter((user) => String(user.id) !== String(id))

    return Promise.resolve()
  },
}
