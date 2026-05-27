import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_SMARTQ_API_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
    'X-SmartQ-Client': 'frontend',
  },
  timeout: 12_000,
})

apiClient.interceptors.request.use((config) => {
  config.headers.Authorization = 'Bearer mock-smartq-token'

  return config
})

export async function resolveMockApi<T>(payload: T, delayMs = 180): Promise<T> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, delayMs)
  })

  return structuredClone(payload)
}
