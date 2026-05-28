import { useEffect, type ReactNode } from 'react'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
  }, [])

  return <>{children}</>
}
