import { apiClient } from './api/client'
import type { User, UserRole } from '../types'

type AuthResponse = {
  access_token: string
  user: User
}

export const userService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      })

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

  logout(): void {
    try {
      localStorage.removeItem('access_token')
    } catch (error) {
      console.error('userService.logout failed', error)
      throw error
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const response = await apiClient.get<User[]>('/users')

      return response.data
    } catch (error) {
      console.error('userService.getUsers failed', error)
      throw error
    }
  },

  async getUserById(id: string): Promise<User | undefined> {
    try {
      const response = await apiClient.get<User>(`/users/${id}`)

      return response.data
    } catch (error) {
      console.error('userService.getUserById failed', error)
      throw error
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me')

      return response.data
    } catch (error) {
      console.error('userService.getCurrentUser failed', error)
      throw error
    }
  },
}
