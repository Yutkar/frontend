import { apiClient } from './api/client'
import type { ServiceType } from '@shared/types'

export type AdminRoomInput = {
  name: string
  department: string
  specialistName?: string
  status?: 'open' | 'busy' | 'paused'
  serviceTypes: ServiceType[]
}

export type AdminRoom = AdminRoomInput & {
  id: string
  currentTicketId?: string
}

export type StaffRole = 'doctor' | 'nurse' | 'admin' | 'manager' | 'specialist'

export type StaffInput = {
  name: string
  email: string
  role: StaffRole
  roomId?: string
}

export type StaffMember = StaffInput & {
  id: string
}

export const adminService = {
  async getRooms(): Promise<AdminRoom[]> {
    try {
      const response = await apiClient.get<AdminRoom[]>('/admin/rooms')

      return response.data
    } catch (error) {
      console.error('adminService.getRooms failed', error)
      throw error
    }
  },

  async createRoom(input: AdminRoomInput): Promise<AdminRoom> {
    try {
      const response = await apiClient.post<AdminRoom>('/admin/rooms', input)

      return response.data
    } catch (error) {
      console.error('adminService.createRoom failed', error)
      throw error
    }
  },

  async updateRoom(id: string, input: AdminRoomInput): Promise<AdminRoom> {
    try {
      const response = await apiClient.put<AdminRoom>(`/admin/rooms/${id}`, input)

      return response.data
    } catch (error) {
      console.error('adminService.updateRoom failed', error)
      throw error
    }
  },

  async deleteRoom(id: string): Promise<void> {
    try {
      await apiClient.delete(`/admin/rooms/${id}`)
    } catch (error) {
      console.error('adminService.deleteRoom failed', error)
      throw error
    }
  },

  async getStaff(): Promise<StaffMember[]> {
    try {
      const response = await apiClient.get<StaffMember[]>('/admin/staff')

      return response.data
    } catch (error) {
      console.error('adminService.getStaff failed', error)
      throw error
    }
  },

  async createUser(input: StaffInput): Promise<StaffMember> {
    try {
      const response = await apiClient.post<StaffMember>('/admin/users', input)

      return response.data
    } catch (error) {
      console.error('adminService.createUser failed', error)
      throw error
    }
  },

  async updateUser(id: string, input: StaffInput): Promise<StaffMember> {
    try {
      const response = await apiClient.put<StaffMember>(`/admin/users/${id}`, input)

      return response.data
    } catch (error) {
      console.error('adminService.updateUser failed', error)
      throw error
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await apiClient.delete(`/admin/users/${id}`)
    } catch (error) {
      console.error('adminService.deleteUser failed', error)
      throw error
    }
  },
}
