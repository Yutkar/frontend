import { Bell, Radio, ShieldCheck, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { RoleSwitcher, ThemeToggle } from '@shared/ui/core-components'
import { useGlobalStore } from '@store/global'

type TopNavbarProps = {
  routes: AppRoute[]
}

export function TopNavbar({ routes }: TopNavbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  
  const user = useGlobalStore((state) => state.user)
  const logout = useGlobalStore((state) => state.logout)   // ← Добавили
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

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-2xl transition-all duration-200 hover:shadow-sm border border-transparent hover:border-red-200 active:scale-95"
          title="Выйти из системы"
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span className="hidden md:inline font-medium">Выйти</span>
        </button>
      </div>
    </header>
  )
}