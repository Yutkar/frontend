import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Bell, Check, Info, LogOut, Radio, ShieldCheck, Siren } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AppRoute } from '@shared/types'
import { t } from '@shared/locales/useLocale'
import type { QueueRecommendation } from '@shared/types'
import { formatTime } from '@shared/utils'
import { useGlobalStore } from '@store/global'
import { useQueueStore } from '@store/queue'
import { ThemeToggle } from '@shared/ui/core-components'

type TopNavbarProps = {
  routes: AppRoute[]
}

const severityLabel: Record<QueueRecommendation['severity'], string> = {
  critical: 'Критично',
  info: 'Информация',
  warning: 'Внимание',
}

function severityIcon(severity: QueueRecommendation['severity']) {
  if (severity === 'critical') {
    return <Siren size={16} />
  }

  if (severity === 'warning') {
    return <AlertTriangle size={16} />
  }

  return <Info size={16} />
}

export function TopNavbar({ routes }: TopNavbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const notificationRef = useRef<HTMLDivElement>(null)
  const notificationsRequested = useRef(false)
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<string[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const user = useGlobalStore((state) => state.user)
  const logout = useGlobalStore((state) => state.logout)
  const hydrated = useQueueStore((state) => state.hydrated)
  const loadQueue = useQueueStore((state) => state.loadQueue)
  const loading = useQueueStore((state) => state.loading)
  const recommendations = useQueueStore((state) => state.recommendations)

  const currentRoute = routes.find((route) => route.path === location.pathname)
  const visibleRecommendations = useMemo(
    () => {
      if (user?.role === 'specialist') {
        return []
      }

      return recommendations.filter(
        (recommendation) => !dismissedRecommendationIds.includes(recommendation.id),
      )
    },
    [dismissedRecommendationIds, recommendations, user?.role],
  )
  const unreadCount = visibleRecommendations.length

  useEffect(() => {
    if (
      !user ||
      user.role === 'specialist' ||
      hydrated ||
      loading ||
      location.pathname === '/dashboard' ||
      notificationsRequested.current
    ) {
      return
    }

    notificationsRequested.current = true
    void loadQueue()
  }, [hydrated, loadQueue, loading, location.pathname, user])

  useEffect(() => {
    if (!notificationsOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [notificationsOpen])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="top-navbar">
      <div>
        <span className="eyebrow">
          <Radio size={14} />
          {t.system.realtimeMonitoring}
        </span>
        <h1>{currentRoute?.label ?? t.system.smartq}</h1>
      </div>

      <div className="navbar-actions">
        <ThemeToggle />

        <div className="notification-menu" ref={notificationRef}>
          <button
            aria-expanded={notificationsOpen}
            aria-label="Открыть уведомления"
            className="notification-button"
            onClick={() => setNotificationsOpen((value) => !value)}
            type="button"
          >
            <Bell size={18} />
            <span>{unreadCount}</span>
          </button>

          {notificationsOpen ? (
            <div className="notification-popover" role="dialog">
              <header>
                <strong>Уведомления</strong>
                <span>{unreadCount} новых</span>
              </header>

              {visibleRecommendations.length > 0 ? (
                <div className="notification-list">
                  {visibleRecommendations.map((recommendation) => (
                    <article
                      className={`notification-item notification-${recommendation.severity}`}
                      key={recommendation.id}
                    >
                      <span className="notification-icon">
                        {severityIcon(recommendation.severity)}
                      </span>
                      <div>
                        <strong>{recommendation.message}</strong>
                        <p>{recommendation.description}</p>
                        <footer>
                          <span>{severityLabel[recommendation.severity]}</span>
                          <time>{formatTime(recommendation.createdAt)}</time>
                        </footer>
                      </div>
                      <button
                        aria-label="Отметить уведомление прочитанным"
                        onClick={() =>
                          setDismissedRecommendationIds((ids) => [
                            ...ids,
                            recommendation.id,
                          ])
                        }
                        type="button"
                      >
                        <Check size={14} />
                        Прочитано
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="notification-empty">Новых уведомлений нет</div>
              )}
            </div>
          ) : null}
        </div>

        {user ? (
          <div className="user-chip">
            <div className="avatar">{user.avatarInitials}</div>
            <div>
              <strong>{user.name}</strong>
              <span>
                <ShieldCheck size={13} />
                {t.roles[user.role]}
              </span>
            </div>
          </div>
        ) : null}

        <button
          onClick={handleLogout}
          className="logout-button"
          title="Выйти из системы"
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span>Выйти</span>
        </button>
      </div>
    </header>
  )
}
