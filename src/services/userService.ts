import { apiClient } from './api/client'
import type { UserRole } from '../types'

type AuthResponse = {
  access_token: string
  role: UserRole
}

export const userService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', { email, password })

      localStorage.setItem('access_token', response.data.access_token)

      return response.data
    } catch (error) {
      console.error('userService.login failed', error)
      throw error
    }
  },

  async register(
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
        role,
      })

      localStorage.setItem('access_token', response.data.access_token)

      return response.data
    } catch (error) {
      console.error('userService.register failed', error)
      throw error
    }
  },

  logout() {
    try {
      localStorage.removeItem('access_token')
    } catch (error) {
      console.error('userService.logout failed', error)
      throw error
    }
  },
}
