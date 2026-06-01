import type { KioskApi } from '../types'
import { createSharedTicket } from './mockState'

export const mockKioskApi: KioskApi = {
  createTicket(input) {
    return Promise.resolve(createSharedTicket(input))
  },
}
