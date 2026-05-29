import { Radio } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'

type TopNavbarProps = {
  routes: AppRoute[]
}

export function TopNavbar({ routes }: TopNavbarProps) {
  const location = useLocation()
  const currentRoute = routes.find((route) => route.path === location.pathname)

  return (
    <header className="top-navbar">
      <div>
        <span className="eyebrow">
          <Radio size={14} />
          {t.system.realtimeMonitoring}
        </span>
        <h1>{currentRoute?.label ?? t.system.smartq}</h1>
      </div>

      <div className="navbar-actions">
        <span className="topbar-shell-label">{t.system.backendReady}</span>
      </div>
    </header>
  )
}
