import {
  Activity,
  BarChart3,
  ClipboardPlus,
  LayoutDashboard,
  Monitor,
  Settings,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { AnalyticsPage } from './AnalyticsPage'
import { DashboardPage } from './DashboardPage'
import { QueuePage } from './QueuePage'
import { RegisterPage } from './RegisterPage'
import { SettingsPage } from './SettingsPage'
import { SpecialistPanelPage } from './SpecialistPanelPage'
import { TicketCreatePage } from './TicketCreatePage'
import { TvBoardPage } from './TvBoardPage'
import { PasswordRecoveryPage } from './PasswordRecoveryPage'

export const smartqBusinessRoutes: AppRoute[] = [
  {
    path: '/register',
    label: 'Регистрация',
    hideFromSidebar: true,
    standalone: true,
    public: true,
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    label: 'Восстановление пароля',
    hideFromSidebar: true,
    standalone: true,
    public: true,
    element: <PasswordRecoveryPage />,
  },
  {
    path: '/dashboard',
    label: t.nav.dashboard,
    icon: LayoutDashboard,
    element: <DashboardPage />,
  },
  {
    path: '/queue',
    label: t.nav.queue,
    icon: Activity,
    element: <QueuePage />,
  },
  {
    path: '/tickets/new',
    label: t.nav.createTicket,
    icon: ClipboardPlus,
    element: <TicketCreatePage />,
  },
  {
    path: '/analytics',
    label: t.nav.analytics,
    icon: BarChart3,
    element: <AnalyticsPage />,
  },
  {
    path: '/specialist',
    label: t.nav.specialist,
    icon: Stethoscope,
    element: <SpecialistPanelPage />,
  },
  {
    path: '/board',
    label: t.nav.tvBoard,
    icon: Monitor,
    fullscreen: true,
    element: <TvBoardPage />,
  },
  {
    path: '/settings',
    label: t.nav.settings,
    icon: Settings,
    element: <SettingsPage />,
  },
]
