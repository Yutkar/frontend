import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { AppLayout } from '@layouts/AppLayout'

type AppRouterProps = {
  routes: AppRoute[]
}

function routePath(path: string): string {
  return path.replace(/^\//, '')
}

export function AppRouter({ routes }: AppRouterProps) {
  const standaloneRoutes = routes.filter((route) => route.standalone)
  const shellRoutes = routes.filter((route) => !route.fullscreen && !route.standalone)
  const fullscreenRoutes = routes.filter((route) => route.fullscreen)
  const navigationRoutes = routes.filter((route) => !route.hideFromSidebar && !route.standalone)
  const fallbackPath = shellRoutes.find((route) => route.path === '/dashboard')?.path ?? shellRoutes[0]?.path ?? '/'

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout routes={navigationRoutes} />}>
          <Route element={<Navigate replace to={fallbackPath} />} index />
          {shellRoutes.map((route) => (
            <Route
              element={route.element}
              key={route.path}
              path={routePath(route.path)}
            />
          ))}
        </Route>

        {fullscreenRoutes.map((route) => (
          <Route
            element={route.element}
            key={route.path}
            path={routePath(route.path)}
          />
        ))}

        {standaloneRoutes.map((route) => (
          <Route
            element={route.element}
            key={route.path}
            path={routePath(route.path)}
          />
        ))}

        <Route element={<Navigate replace to={fallbackPath} />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}
