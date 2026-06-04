import {
  BarChart3,
  ClipboardPlus,
  History,
  LayoutDashboard,
  Monitor,
  Settings,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { AnalyticsPage } from './AnalyticsPage'
import { AdminPage } from './admin/AdminPage'
import { DashboardPage } from './DashboardPage'
import { KioskPage } from './KioskPage'
import { SettingsPage } from './SettingsPage'
import { SpecialistPanelPage } from './SpecialistPanelPage'
import { TicketCreatePage } from './TicketCreatePage'
import { TvBoardPage } from './TvBoardPage'
import { VisitHistoryPage } from './VisitHistoryPage'

export const smartqBusinessRoutes: AppRoute[] = [
  {
    path: '/dashboard',
    label: t.nav.dashboard,
    icon: LayoutDashboard,
    allowedRoles: ['admin', 'manager'],
    element: <DashboardPage />,
  },
  {
    path: '/queue',
    label: t.nav.dashboard,
    allowedRoles: ['admin', 'manager'],
    hideFromSidebar: true,
    element: <Navigate replace to="/dashboard" />,
  },
  {
    path: '/tickets',
    label: t.nav.createTicket,
    icon: ClipboardPlus,
    allowedRoles: ['admin', 'manager'],
    element: <TicketCreatePage />,
  },
  {
    path: '/analytics',
    label: t.nav.analytics,
    icon: BarChart3,
    allowedRoles: ['admin', 'manager'],
    element: <AnalyticsPage />,
  },
  {
    path: '/admin',
    label: 'Администрирование',
    icon: ShieldCheck,
    allowedRoles: ['admin', 'manager'],
    element: <AdminPage />,
  },
  {
    path: '/admin/rooms',
    label: 'Кабинеты',
    allowedRoles: ['admin', 'manager'],
    hideFromSidebar: true,
    element: <Navigate replace to="/admin" />,
  },
  {
    path: '/admin/staff',
    label: 'Персонал',
    allowedRoles: ['admin', 'manager'],
    hideFromSidebar: true,
    element: <Navigate replace to="/admin" />,
  },
  {
    path: '/admin/doctor-rooms',
    label: 'Администрирование',
    allowedRoles: ['admin', 'manager'],
    hideFromSidebar: true,
    element: <Navigate replace to="/admin" />,
  },
  {
    path: '/admin/managers',
    label: 'Менеджеры',
    allowedRoles: ['admin', 'manager'],
    hideFromSidebar: true,
    element: <Navigate replace to="/admin" />,
  },
  {
    path: '/specialist',
    label: t.nav.specialist,
    icon: Stethoscope,
    allowedRoles: ['specialist'],
    element: <SpecialistPanelPage />,
  },
  {
    path: '/visit-history',
    label: 'История посещений',
    icon: History,
    allowedRoles: ['specialist'],
    element: <VisitHistoryPage />,
  },
  {
    path: '/board',
    label: t.nav.tvBoard,
    icon: Monitor,
    standalone: true,
    public: true,
    hideFromSidebar: true,
    element: <TvBoardPage />,
  },
  {
    path: '/kiosk',
    label: 'Киоск',
    icon: Monitor,
    standalone: true,
    public: true,
    hideFromSidebar: true,
    element: <KioskPage />,
  },
  {
    path: '/settings',
    label: t.nav.settings,
    icon: Settings,
    allowedRoles: ['admin', 'manager'],
    element: <SettingsPage />,
  },
]
