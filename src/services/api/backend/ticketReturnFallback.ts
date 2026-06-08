import { apiClient } from '../client'
import { getBackendTicketRoomId, toSharedStatus } from '../backendAdapters'
import type { BackendTicket } from '../backendAdapters'

type AxiosErrorLike = {
  isAxiosError?: boolean
  response?: {
    status?: number
  }
}

type TicketReturnOptions = {
  roomId?: string | number
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

function shouldRetryPatchWithoutRoom(error: unknown): boolean {
  const status = getHttpStatus(error)

  return status === 400 || status === 422
}

function isUnsupportedStatusPatch(error: unknown): boolean {
  const status = getHttpStatus(error)

  return status === 400 || status === 404 || status === 405 || status === 422 || status === 501
}

function isForbidden(error: unknown): boolean {
  return getHttpStatus(error) === 403
}

function createForbiddenReturnError(): Error {
  return new Error('Недостаточно прав для возврата пациента')
}

function toBackendRoomId(roomId: string | number): string | number {
  const numericRoomId = Number(roomId)

  return Number.isFinite(numericRoomId) ? numericRoomId : roomId
}

function toWaitingPayload(roomId?: string | number) {
  return {
    status: 'waiting',
    ...(roomId !== undefined ? { roomId: toBackendRoomId(roomId) } : {}),
  }
}

async function getTicketById(id: string): Promise<BackendTicket | undefined> {
  try {
    const response = await apiClient.get<BackendTicket>(`/tickets/${id}`)

    return response.data
  } catch (error) {
    console.warn('ticketReturnFallback: GET /tickets/:id failed after return', error)

    return undefined
  }
}

function withWaitingStatus(ticket: BackendTicket | undefined, id: string, roomId?: string | number): BackendTicket {
  const resolvedRoomId = ticket ? getBackendTicketRoomId(ticket) : undefined

  return {
    ...(ticket ?? { id }),
    id: ticket?.id ?? id,
    roomId: resolvedRoomId ?? roomId,
    status: 'waiting',
  }
}

function isWaitingTicket(ticket?: BackendTicket): boolean {
  return ticket ? toSharedStatus(ticket.status) === 'waiting' : false
}

async function resolveFallbackRoomId(id: string, roomId?: string | number): Promise<string | number | undefined> {
  if (roomId !== undefined) {
    return roomId
  }

  const ticket = await getTicketById(id)
  const ticketRoomId = ticket ? getBackendTicketRoomId(ticket) : undefined

  return ticketRoomId || undefined
}

async function patchTicketToWaiting(id: string, roomId?: string | number): Promise<BackendTicket> {
  let response: { data?: BackendTicket | undefined }

  try {
    response = await apiClient.patch<BackendTicket | undefined>(`/tickets/${id}`, toWaitingPayload(roomId))
  } catch (error) {
    if (!shouldRetryPatchWithoutRoom(error) || roomId === undefined) {
      throw error
    }

    response = await apiClient.patch<BackendTicket | undefined>(`/tickets/${id}`, toWaitingPayload())
  }

  if (response.data) {
    return withWaitingStatus(response.data, id, roomId)
  }

  const ticket = await getTicketById(id)

  return withWaitingStatus(ticket, id, roomId)
}

export async function requestTicketReturn(id: string, options: TicketReturnOptions = {}): Promise<BackendTicket> {
  try {
    const response = await apiClient.post<BackendTicket | undefined>(`/tickets/${id}/return`)
    const returnedTicket = response.data
    const roomId = returnedTicket ? getBackendTicketRoomId(returnedTicket) || options.roomId : options.roomId
    const latestTicket = await getTicketById(id)

    if (isWaitingTicket(latestTicket)) {
      return withWaitingStatus(latestTicket, id, roomId)
    }

    if (isWaitingTicket(returnedTicket)) {
      return withWaitingStatus(returnedTicket, id, roomId)
    }

    return await patchTicketToWaiting(id, await resolveFallbackRoomId(id, roomId))
  } catch (returnError) {
    if (isForbidden(returnError)) {
      throw createForbiddenReturnError()
    }

    if (!isUnsupportedEndpoint(returnError)) {
      throw returnError
    }
  }

  try {
    const roomId = await resolveFallbackRoomId(id, options.roomId)

    return await patchTicketToWaiting(id, roomId)
  } catch (patchError) {
    if (isForbidden(patchError)) {
      throw createForbiddenReturnError()
    }

    if (isUnsupportedStatusPatch(patchError)) {
      throw new Error('Возврат пациента пока не поддерживается сервером')
    }

    throw patchError
  }
}
