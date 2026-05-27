import { AppProviders } from '@app/providers/AppProviders'
import { AppRouter } from '@routes'
import type { AppRoute } from '@shared/types'

type AppProps = {
  routes: AppRoute[]
}

export function App({ routes }: AppProps) {
  return (
    <AppProviders>
      <AppRouter routes={routes} />
    </AppProviders>
  )
}
