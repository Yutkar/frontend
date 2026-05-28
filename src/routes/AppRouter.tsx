import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Button } from '@shared/ui/components'
import { useGlobalStore } from '@store/global'
import { AppLayout } from '@layouts/AppLayout'
import { LoginPage } from '@pages/LoginPage'     // ← Изменено на named import

type AppRouterProps = {
  routes: AppRoute[]
}

function routePath(path: string): string {
  return path.replace(/^\//, '')
}

function GuardedRoute({ route }: { route: AppRoute }) {
  const user = useGlobalStore((state) => state.user)
  const allowed = !route.allowedRoles || route.allowedRoles.includes(user.role)

  // Простая проверка
  if (!user) {
    return <Navigate to="/login" replace />
  }

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
  const initializeAuth = useGlobalStore((state) => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  const standaloneRoutes = routes.filter((route) => route.standalone)
  const publicStandaloneRoutes = standaloneRoutes.filter((route) => route.public)
  const protectedStandaloneRoutes = standaloneRoutes.filter((route) => !route.public)
  const shellRoutes = routes.filter((route) => !route.fullscreen && !route.standalone)
  const fullscreenRoutes = routes.filter((route) => route.fullscreen)
  const navigationRoutes = routes.filter((route) => !route.hideFromSidebar && !route.standalone)

  const fallbackPath = shellRoutes.find((route) => route.path === '/dashboard')?.path ?? shellRoutes[0]?.path ?? '/'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

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

        {publicStandaloneRoutes.map((route) => (
          <Route
            key={route.path}
            path={routePath(route.path)}
            element={route.element}
          />
        ))}

        {protectedStandaloneRoutes.map((route) => (
          <Route
            element={<GuardedRoute route={route} />}
            key={route.path}
            path={routePath(route.path)}
          />
        ))}

        <Route element={<Navigate replace to="/login" />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}