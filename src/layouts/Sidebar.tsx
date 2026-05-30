import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { IconButton } from '@shared/ui/core-components'
import { useGlobalStore } from '@store/global'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
  routes: AppRoute[]
}

export function Sidebar({ collapsed, onToggle, routes }: SidebarProps) {
  const user = useGlobalStore((state) => state.user)

  // Фильтруем маршруты по ролям пользователя
  const visibleRoutes = routes.filter((route) => {
    if (!route.allowedRoles) return true
    return route.allowedRoles.includes(user?.role || '')
  })

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">SQ</div>
        <div className="brand-copy">
          <strong>{t.system.smartq}</strong>
          <span>{t.system.controlSystem}</span>
        </div>
        <IconButton
          icon={<Menu size={18} />}
          label={t.system.toggleSidebar}
          onClick={onToggle}
        />
      </div>

      <nav className="sidebar-nav">
        {visibleRoutes.map((route) => {
          const Icon = route.icon

          return (
            <NavLink className="sidebar-link" key={route.path} to={route.path}>
              <Icon size={19} strokeWidth={2.1} />
              <span>{route.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
