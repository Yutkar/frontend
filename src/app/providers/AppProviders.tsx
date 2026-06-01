import { useEffect, type ReactNode } from 'react'
import { useGlobalStore } from '@store/global'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const theme = useGlobalStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('smartq-theme', theme)
  }, [theme])

  return <>{children}</>
}
