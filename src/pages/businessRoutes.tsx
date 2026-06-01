import {
  Activity,
  BarChart3,
  Building2,
  ClipboardPlus,
  Link2,
  LayoutDashboard,
  Monitor,
  Settings,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from 'lucide-react'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { AnalyticsPage } from './AnalyticsPage'
import { AdminDoctorRoomsPage } from './admin/AdminDoctorRoomsPage'
import { AdminManagersPage } from './admin/AdminManagersPage'
import { AdminRoomsPage } from './admin/AdminRoomsPage'
import { AdminStaffPage } from './admin/AdminStaffPage'
import { DashboardPage } from './DashboardPage'
import { KioskPage } from './KioskPage'
import { QueuePage } from './QueuePage'
import { SettingsPage } from './SettingsPage'
import { SpecialistPanelPage } from './SpecialistPanelPage'
import { TicketCreatePage } from './TicketCreatePage'
import { TvBoardPage } from './TvBoardPage'

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
    label: t.nav.queue,
    icon: Activity,
    allowedRoles: ['admin', 'manager'],
    element: <QueuePage />,
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
    path: '/admin/rooms',
    label: 'Кабинеты',
    icon: Building2,
    groupLabel: 'Администрирование',
    allowedRoles: ['admin', 'manager'],
    element: <AdminRoomsPage />,
  },
  {
    path: '/admin/staff',
    label: 'Персонал',
    icon: UsersRound,
    groupLabel: 'Администрирование',
    allowedRoles: ['admin', 'manager'],
    element: <AdminStaffPage />,
  },
  {
    path: '/admin/doctor-rooms',
    label: 'Привязка врачей',
    icon: Link2,
    groupLabel: 'Администрирование',
    allowedRoles: ['admin', 'manager'],
    element: <AdminDoctorRoomsPage />,
  },
  {
    path: '/admin/managers',
    label: 'Менеджеры',
    icon: ShieldCheck,
    groupLabel: 'Администрирование',
    allowedRoles: ['admin'],
    element: <AdminManagersPage />,
  },
  {
    path: '/specialist',
    label: t.nav.specialist,
    icon: Stethoscope,
    allowedRoles: ['specialist'],
    element: <SpecialistPanelPage />,
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
    allowedRoles: ['admin', 'manager', 'specialist'],
    element: <SettingsPage />,
  },
]
