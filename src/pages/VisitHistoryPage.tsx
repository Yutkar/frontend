import { useCallback } from 'react'
import { PageHeader, ResourceBanner } from '@components'
import { visitService, type Visit } from '@services/visitService'
import type { ServiceType } from '@shared/types'
import { StatusBadge } from '@shared/ui/components'
import { getServiceTypeLabel } from '@shared/utils'
import { useServiceResource } from '@shared/useServiceResource'
import { useGlobalStore } from '@store/global'

const emptyVisits: Visit[] = []
const serviceTypes: ServiceType[] = [
  'registration',
  'consultation',
  'diagnostics',
  'laboratory',
  'pharmacy',
  'billing',
]

function getVisitServiceLabel(service?: string): string {
  if (!service) {
    return '-'
  }

  return serviceTypes.includes(service as ServiceType)
    ? getServiceTypeLabel(service as ServiceType)
    : service
}

export function VisitHistoryPage() {
  const user = useGlobalStore((state) => state.user)
  const specialistRoomId = user?.roomId ?? user?.assignedRoomId
  const loadVisits = useCallback(async (): Promise<Visit[]> => {
    if (!user) {
      return emptyVisits
    }

    return visitService.getTodayVisits({
      roomId: specialistRoomId,
      userId: user.id,
    })
  }, [specialistRoomId, user])
  const { data: visits, loading, error } = useServiceResource(loadVisits, emptyVisits)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Кабинет специалиста"
        title="История посещений"
        description="Завершённые, отменённые, неявившиеся и перенаправленные посещения за сегодня."
      />
      <ResourceBanner error={error} loading={loading} />

      <section className="primary-panel">
        {visits.length === 0 && !loading ? (
          <p className="muted-copy">Нет посещений за сегодня.</p>
        ) : (
          <div className="table-shell">
            <table className="queue-table visit-history-table">
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Пациент</th>
                  <th>Талон</th>
                  <th>Услуга</th>
                  <th>Кабинет</th>
                  <th>Статус</th>
                  <th>Приоритет</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.time}</td>
                    <td>{visit.patient}</td>
                    <td>{visit.ticket}</td>
                    <td>{getVisitServiceLabel(visit.service)}</td>
                    <td>{visit.room ?? '-'}</td>
                    <td><StatusBadge status={visit.status} /></td>
                    <td><StatusBadge priority={visit.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
