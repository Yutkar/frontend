import { cloneData, users } from './data'
import type { User } from '../types'

export const userService = {
  async getUsers(): Promise<User[]> {
    return cloneData(users)
  },

  async getUserById(id: string): Promise<User | undefined> {
    return cloneData(users.find((user) => user.id === id))
  },

  async getCurrentUser(): Promise<User> {
    return cloneData(users[1])
  },
}
