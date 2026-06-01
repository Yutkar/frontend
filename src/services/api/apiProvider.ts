export type ApiMode = 'mock' | 'backend'

export const API_MODE: ApiMode = import.meta.env.VITE_API_MODE === 'backend' ? 'backend' : 'mock'
