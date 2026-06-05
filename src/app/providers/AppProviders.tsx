import { useEffect, type ReactNode } from 'react'
import { useGlobalStore } from '@store/global'
import { useQueueStore } from '@store/queue'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const theme = useGlobalStore((state) => state.theme)
  const user = useGlobalStore((state) => state.user)
  const startRealtime = useQueueStore((state) => state.startRealtime)
  const stopRealtime = useQueueStore((state) => state.stopRealtime)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('smartq-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!user) {
      stopRealtime()
      return
    }

    startRealtime()

    return () => {
      stopRealtime()
    }
  }, [startRealtime, stopRealtime, user])

  return <>{children}</>
}
