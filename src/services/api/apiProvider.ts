export type ApiMode = 'mock' | 'backend'

const rawApiMode = import.meta.env.VITE_API_MODE

export const API_MODE: ApiMode = rawApiMode === 'backend' ? 'backend' : 'mock'
export const API_BASE_URL = import.meta.env.VITE_SMARTQ_API_URL || 'http://localhost:3000'
export const isBackendMode = API_MODE === 'backend'
export const isMockMode = API_MODE === 'mock'
