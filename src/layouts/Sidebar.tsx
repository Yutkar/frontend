import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { IconButton } from '@shared/ui/core-components'
import { useGlobalStore } from '@store/global'

type SidebarProps = {
  routes: AppRoute[]
}

export function Sidebar({ routes }: SidebarProps) {
  const collapsed = useGlobalStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useGlobalStore((state) => state.toggleSidebar)

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">SQ</div>
        <div className="brand-copy">
          <strong>{t.system.smartq}</strong>
          <span>{t.system.controlSystem}</span>
        </div>
        <IconButton icon={<Menu size={18} />} label={t.system.toggleSidebar} onClick={toggleSidebar} />
      </div>

      <nav className="sidebar-nav">
        {routes.map((route) => {
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
