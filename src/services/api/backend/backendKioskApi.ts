import {
  toBackendPriority,
  toBackendTicketCreateInput,
  toSharedTicket,
  type BackendTicket,
} from '../backendAdapters'
import { apiClient } from '../client'
import type { KioskApi } from '../types'

type TicketCreateBody = {
  priority: number
  roomId?: number
  serviceTypeId: number
}

async function arriveCreatedTicket(ticket: BackendTicket): Promise<BackendTicket> {
  if (ticket.status !== 'created') {
    return ticket
  }

  const response = await apiClient.post<BackendTicket>(`/tickets/${ticket.id}/arrive`)

  return response.data
}

function withoutRoomId(payload: TicketCreateBody) {
  return {
    priority: payload.priority,
    serviceTypeId: payload.serviceTypeId,
  }
}

async function createBackendTicket(path: string, payload: TicketCreateBody): Promise<BackendTicket> {
  try {
    const response = await apiClient.post<BackendTicket>(path, payload)

    return response.data
  } catch (error) {
    if (payload.roomId === undefined) {
      throw error
    }

    console.warn('backendKioskApi: POST /tickets with roomId failed, retrying without roomId', error)
    const response = await apiClient.post<BackendTicket>(path, withoutRoomId(payload))

    try {
      const patchResponse = await apiClient.patch<BackendTicket>(`/tickets/${response.data.id}`, {
        roomId: payload.roomId,
      })

      return patchResponse.data ?? response.data
    } catch (patchError) {
      console.warn('backendKioskApi: PATCH /tickets/:id roomId fallback failed', patchError)

      return response.data
    }
  }
}

export const backendKioskApi: KioskApi = {
  async createTicket(input) {
    const createdTicket = await createBackendTicket(
      '/tickets/kiosk',
      toBackendTicketCreateInput(input),
    )
    const ticket = await arriveCreatedTicket(createdTicket)

    return toSharedTicket(ticket)
  },

  async createTicketForKiosk(input) {
    const roomId = Number(input.roomId)
    const createdTicket = await createBackendTicket('/tickets/kiosk', {
      priority: toBackendPriority(input.priority),
      ...(Number.isFinite(roomId) ? { roomId } : {}),
      serviceTypeId: Number(input.serviceTypeId),
    })
    const ticket = await arriveCreatedTicket(createdTicket)

    return toSharedTicket(ticket)
  },
}
