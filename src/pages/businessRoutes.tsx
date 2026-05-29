import {
  Activity,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Monitor,
  Stethoscope,
} from 'lucide-react'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import { Analytics } from './Analytics'
import { Board } from './Board'
import { Dashboard } from './Dashboard'
import { Queue } from './Queue'
import { Specialist } from './Specialist'
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
    path: '/tickets',
    label: t.nav.tickets,
    icon: ClipboardList,
    element: <Tickets />,
  },
  {
    path: '/analytics',
    label: t.nav.analytics,
    icon: BarChart3,
    element: <Analytics />,
  },
  {
    path: '/specialist',
    label: t.nav.specialist,
    icon: Stethoscope,
    element: <Specialist />,
  },
  {
    path: '/board',
    label: t.nav.tvBoard,
    icon: Monitor,
    fullscreen: true,
    element: <Board />,
  },
]
