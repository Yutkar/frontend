import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getAppInitials, useAppSettings } from '@services/appSettingsService'
import type { AppRoute } from '@shared/types'
import { useLocale } from '@shared/locales/useLocale'
import { IconButton } from '@shared/ui/core-components'
import { useGlobalStore } from '@store/global'

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
  routes: AppRoute[]
}

export function Sidebar({ collapsed, onToggle, routes }: SidebarProps) {
  const appSettings = useAppSettings()
  const t = useLocale()
  const user = useGlobalStore((state) => state.user)

  const visibleRoutes = routes.filter((route) => {
    if (!route.allowedRoles) return true
    return user ? route.allowedRoles.includes(user.role) : false
  })
  const ungroupedRoutes = visibleRoutes.filter((route) => !route.groupLabel)
  const groupedRoutes = visibleRoutes.reduce<Record<string, AppRoute[]>>((groups, route) => {
    if (!route.groupLabel) {
      return groups
    }

    return {
      ...groups,
      [route.groupLabel]: [...(groups[route.groupLabel] ?? []), route],
    }
  }, {})

  function renderLink(route: AppRoute) {
    const Icon = route.icon

    if (!Icon) {
      return null
    }

    return (
      <NavLink className="sidebar-link" key={route.path} to={route.path}>
        <Icon size={19} strokeWidth={2.1} />
        <span>{getRouteLabel(route)}</span>
      </NavLink>
    )
  }

  function getRouteLabel(route: AppRoute): string {
    if (route.path === '/dashboard') return t.nav.dashboard
    if (route.path === '/analytics') return t.nav.analytics
    if (route.path === '/admin') return t.nav.admin
    if (route.path === '/specialist') return t.nav.specialist
    if (route.path === '/visit-history') return t.nav.visitHistory
    if (route.path === '/board') return t.nav.tvBoard
    if (route.path === '/kiosk') return t.nav.kiosk

    return route.label
  }

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        {appSettings.logoDataUrl ? (
          <img alt={appSettings.appName} className="brand-logo" src={appSettings.logoDataUrl} />
        ) : (
          <div className="brand-mark">{getAppInitials(appSettings.appName)}</div>
        )}
        <div className="brand-copy">
          <strong>{appSettings.appName}</strong>
          <span>{t.system.controlSystem}</span>
        </div>
        <IconButton
          icon={<Menu size={18} />}
          label={t.system.toggleSidebar}
          onClick={onToggle}
        />
      </div>

      <nav className="sidebar-nav">
        {ungroupedRoutes.map(renderLink)}
        {Object.entries(groupedRoutes).map(([groupLabel, groupRoutes]) => (
          <div className="sidebar-group" key={groupLabel}>
            <span className="sidebar-group-label">{groupLabel}</span>
            {groupRoutes.map(renderLink)}
          </div>
        ))}
      </nav>
    </aside>
  )
}
