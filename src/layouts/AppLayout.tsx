import { Outlet } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { Sidebar } from './Sidebar'
import { TopNavbar } from './TopNavbar'

type AppLayoutProps = {
  routes: AppRoute[]
}

export function AppLayout({ routes }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar routes={routes} />
      <main className="app-main">
        <TopNavbar routes={routes} />
        <div className="page-viewport">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
