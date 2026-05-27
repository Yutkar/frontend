import { mockUsers } from '@mock/auth.mock'
import type { Role, User } from '@shared/types'
import { resolveMockApi } from './client'

export const authApi = {
  getDefaultUser(): User {
    return mockUsers.manager
  },

  async loginAsRole(role: Role): Promise<User> {
    return resolveMockApi(mockUsers[role], 120)
  },
}
