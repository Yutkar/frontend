import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { useGlobalStore } from '@store/global'
import { AppLayout } from '@layouts/AppLayout'

type AppRouterProps = {
  routes: AppRoute[]
}

function routePath(path: string): string {
  return path.replace(/^\//, '')
}

function GuardedRoute({ route }: { route: AppRoute }) {
  const user = useGlobalStore((state) => state.user)
  const allowed = !route.allowedRoles || route.allowedRoles.includes(user.role)

  if (!allowed) {
    return (
      <section className="empty-state">
        <span className="eyebrow">{t.system.accessControl}</span>
        <h1>{t.system.rolePermissionRequired}</h1>
        <p>{t.system.cannotOpenWorkspace}</p>
        <Button onClick={() => window.history.back()} variant="primary">
          {t.system.goBack}
        </Button>
      </section>
    )
  }

  return <>{route.element}</>
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
              element={<GuardedRoute route={route} />}
              key={route.path}
              path={routePath(route.path)}
            />
          ))}
        </Route>

        {fullscreenRoutes.map((route) => (
          <Route
            element={<GuardedRoute route={route} />}
            key={route.path}
            path={routePath(route.path)}
          />
        ))}

        {standaloneRoutes.map((route) => (
          <Route
            element={<GuardedRoute route={route} />}
            key={route.path}
            path={routePath(route.path)}
          />
        ))}

        <Route element={<Navigate replace to={fallbackPath} />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}
