import { Bell, Radio, ShieldCheck, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { useGlobalStore } from '@store/global'
import { ThemeToggle } from '@shared/ui/core-components'

type TopNavbarProps = {
  routes: AppRoute[]
}

export function TopNavbar({ routes }: TopNavbarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const user = useGlobalStore((state) => state.user)
  const logout = useGlobalStore((state) => state.logout)

  const currentRoute = routes.find((route) => route.path === location.pathname)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

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
        <ThemeToggle />

        <button className="notification-button" type="button">
          <Bell size={18} />
          <span>3</span>
        </button>

        {user ? (
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
        ) : null}

        <button
          onClick={handleLogout}
          className="logout-button"
          title="Выйти из системы"
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span>Выйти</span>
        </button>
      </div>
    </header>
  )
}