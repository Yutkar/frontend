import { Bell, Radio, ShieldCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { RoleSwitcher, ThemeToggle } from '@shared/ui/core-components'
import { useGlobalStore } from '@store/global'

type TopNavbarProps = {
  routes: AppRoute[]
}

export function TopNavbar({ routes }: TopNavbarProps) {
  const location = useLocation()
  const user = useGlobalStore((state) => state.user)
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
        <RoleSwitcher />
        <ThemeToggle />
        <button className="notification-button" type="button">
          <Bell size={18} />
          <span>3</span>
        </button>
        <div className="user-chip">
          <div className="avatar">{user.avatarInitials}</div>
          <div>
            <strong>{user.name}</strong>
            <span>
              <ShieldCheck size={13} />
              {t.roles[user.role]}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
