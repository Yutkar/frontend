import { apiClient } from '../client'
import type { BackendTicket } from '../backendAdapters'

type AxiosErrorLike = {
  isAxiosError?: boolean
  response?: {
    status?: number
  }
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  return (error as AxiosErrorLike).response?.status
}

function isUnsupportedEndpoint(error: unknown): boolean {
  const status = getHttpStatus(error)

  return status === 404 || status === 405 || status === 501
}

function isUnsupportedStatusPatch(error: unknown): boolean {
  const status = getHttpStatus(error)

  return status === 400 || status === 404 || status === 405 || status === 422 || status === 501
}

async function patchTicketToWaiting(id: string): Promise<BackendTicket> {
  const response = await apiClient.patch<BackendTicket | undefined>(`/tickets/${id}`, {
    status: 'waiting',
  })

  if (response.data) {
    return response.data
  }

  const ticketResponse = await apiClient.get<BackendTicket>(`/tickets/${id}`)

  return ticketResponse.data
}

export async function requestTicketReturn(id: string): Promise<BackendTicket> {
  try {
    const response = await apiClient.post<BackendTicket>(`/tickets/${id}/return`)

    return response.data
  } catch (returnError) {
    if (!isUnsupportedEndpoint(returnError)) {
      throw returnError
    }
  }

  try {
    return await patchTicketToWaiting(id)
  } catch (patchError) {
    if (isUnsupportedStatusPatch(patchError)) {
      throw new Error('Возврат пациента пока не поддерживается сервером')
    }

    throw patchError
  }
}
