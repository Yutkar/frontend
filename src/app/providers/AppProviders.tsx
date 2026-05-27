import { useEffect, type ReactNode } from 'react'
import { socketClient } from '@services/api'
import { useGlobalStore } from '@store/global'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const theme = useGlobalStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    socketClient.connect()

    return () => {
      socketClient.disconnect()
    }
  }, [])

  return <>{children}</>
}
