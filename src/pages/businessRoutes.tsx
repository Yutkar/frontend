import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Monitor,
  Settings,
  Stethoscope,
  TicketCheck,
  UserCog,
} from 'lucide-react'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { AdminDashboard } from './AdminDashboard'
import { AdminRoomsPage } from './AdminRoomsPage'
import { AdminStaffPage } from './AdminStaffPage'
import { Analytics } from './Analytics'
import { Board } from './Board'
import { Dashboard } from './Dashboard'
import { KioskPage } from './KioskPage'
import { Queue } from './Queue'
import { SpecialistPanelPage } from './SpecialistPanelPage'
import { Tickets } from './Tickets'

export const smartqBusinessRoutes: AppRoute[] = [
  {
    path: '/dashboard',
    label: t.nav.dashboard,
    icon: LayoutDashboard,
    element: <Dashboard />,
  },
  {
    path: '/queue',
    label: t.nav.queue,
    icon: Activity,
    element: <Queue />,
  },
  {
    path: '/board',
    label: 'Табло',
    icon: Monitor,
    fullscreen: true,
    element: <Board />,
  },
  {
    path: '/analytics',
    label: t.nav.analytics,
    icon: BarChart3,
    element: <Analytics />,
  },
  {
    path: '/specialist',
    label: 'Панель специалиста',
    icon: Stethoscope,
    element: <SpecialistPanelPage />,
  },
  {
    path: '/tickets',
    label: t.nav.tickets,
    icon: ClipboardList,
    hideFromSidebar: true,
    element: <Tickets />,
  },
  {
    path: '/admin',
    label: 'Администрирование',
    icon: Settings,
    navSection: 'Администрирование',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/rooms',
    label: 'Кабинеты',
    icon: Building2,
    navSection: 'Администрирование',
    element: <AdminRoomsPage />,
  },
  {
    path: '/admin/staff',
    label: 'Персонал',
    icon: UserCog,
    navSection: 'Администрирование',
    element: <AdminStaffPage />,
  },
  {
    path: '/kiosk',
    label: 'Киоск',
    icon: TicketCheck,
    fullscreen: true,
    element: <KioskPage />,
  },
]
