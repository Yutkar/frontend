import { Fragment } from 'react'
import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { IconButton } from '@shared/ui/core-components'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
  routes: AppRoute[]
}

export function Sidebar({ collapsed, onToggle, routes }: SidebarProps) {
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
        {routes.map((route, index) => {
          const Icon = route.icon
          const previousRoute = routes[index - 1]
          const showSection = route.navSection && route.navSection !== previousRoute?.navSection

          return (
            <Fragment key={route.path}>
              {showSection ? <span className="sidebar-section-label">{route.navSection}</span> : null}
              <NavLink className="sidebar-link" to={route.path}>
                <Icon size={19} strokeWidth={2.1} />
                <span>{route.label}</span>
              </NavLink>
            </Fragment>
          )
        })}
      </nav>
    </aside>
  )
}
