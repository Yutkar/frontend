import { apiClient } from './api/client'

export const userService = {
  async login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password })
    localStorage.setItem('access_token', response.data.access_token)
    return response.data
  },

  async register(name: string, email: string, password: string, role: string) {
    const response = await apiClient.post('/auth/register', { name, email, password, role })
    localStorage.setItem('access_token', response.data.access_token)
    return response.data
  },

  logout() {
    localStorage.removeItem('access_token')
  },
}