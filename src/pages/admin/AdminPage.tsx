import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Stethoscope, UsersRound } from 'lucide-react'
import { adminService } from '@services/adminService'
import type { Role } from '@shared/types'
import { useGlobalStore } from '@store/global'
import { useQueueStore } from '@store/queue'
import { getRoomActive, type AdminRoomRecord } from './adminPageHelpers'
import { ManagersSection } from './AdminManagersPage'
import { RoomsSection } from './AdminRoomsPage'
import { StaffSection } from './AdminStaffPage'
import { BoardSettingsSection } from './AdminBoardSettingsPage'
import { QueueRoutingSection } from './AdminQueueRoutingPage'

type AdminSectionId = 'rooms' | 'routing' | 'staff' | 'managers' | 'board'

type AdminSectionConfig = {
  id: AdminSectionId
  label: string
  roles: Role[]
}

type AdminSummary = {
  activeRooms: number
  doctors: number
  managers: number
  totalRooms: number
}

const adminSections: AdminSectionConfig[] = [
  { id: 'rooms', label: 'Кабинеты', roles: ['admin', 'manager'] },
  { id: 'routing', label: 'Настройки очередей', roles: ['admin', 'manager'] },
  { id: 'staff', label: 'Персонал', roles: ['admin', 'manager'] },
  { id: 'managers', label: 'Менеджеры', roles: ['admin'] },
  { id: 'board', label: 'Табло', roles: ['admin', 'manager'] },
]

const emptySummary: AdminSummary = {
  activeRooms: 0,
  doctors: 0,
  managers: 0,
  totalRooms: 0,
}

export function AdminPage() {
  const user = useGlobalStore((state) => state.user)
  const loadQueue = useQueueStore((state) => state.loadQueue)
  const [activeSection, setActiveSection] = useState<AdminSectionId>('rooms')
  const [roomsVersion, setRoomsVersion] = useState(0)
  const [summary, setSummary] = useState<AdminSummary>(emptySummary)
  const canManageManagers = user?.role === 'admin'

  const visibleSections = useMemo(
    () => adminSections.filter((section) => user && section.roles.includes(user.role)),
    [user],
  )
  const selectedSection = visibleSections.find((section) => section.id === activeSection) ?? visibleSections[0]

  const loadSummary = useCallback(async () => {
    try {
      const [rooms, staff, managers] = await Promise.all([
        adminService.getRooms(),
        adminService.getStaff(),
        canManageManagers ? adminService.getManagers() : Promise.resolve([]),
      ])
      const roomRecords = rooms as AdminRoomRecord[]

      setSummary({
        activeRooms: roomRecords.filter(getRoomActive).length,
        doctors: staff.length,
        managers: managers.length,
        totalRooms: roomRecords.length,
      })
    } catch (error) {
      console.error('Admin summary load failed', error)
      setSummary(emptySummary)
    }
  }, [canManageManagers])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  function handleRoomsChange() {
    setRoomsVersion((version) => version + 1)
    void loadSummary()
    void loadQueue({ force: true, successMessage: 'Данные успешно обновлены' })
  }

  function handleAdminDataChange() {
    void loadSummary()
  }

  return (
    <div className="page-stack">
      <p className="admin-page-lead">Настройка кабинетов, персонала и доступов</p>

      <section aria-label="Сводка администрирования" className="admin-summary-grid">
        <article className="admin-summary-card">
          <Building2 size={18} />
          <span>Всего кабинетов</span>
          <strong>{summary.totalRooms}</strong>
        </article>
        <article className="admin-summary-card">
          <CheckCircle2 size={18} />
          <span>Активных кабинетов</span>
          <strong>{summary.activeRooms}</strong>
        </article>
        <article className="admin-summary-card">
          <Stethoscope size={18} />
          <span>Врачей</span>
          <strong>{summary.doctors}</strong>
        </article>
        {canManageManagers ? (
          <article className="admin-summary-card">
            <UsersRound size={18} />
            <span>Менеджеров</span>
            <strong>{summary.managers}</strong>
          </article>
        ) : null}
      </section>

      <nav aria-label="Разделы администрирования" className="admin-section-switcher segmented-control">
        {visibleSections.map((section) => (
          <button
            className={selectedSection?.id === section.id ? 'active' : ''}
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </nav>

      {selectedSection?.id === 'rooms' ? <RoomsSection onRoomsChange={handleRoomsChange} /> : null}
      {selectedSection?.id === 'routing' ? <QueueRoutingSection onRoutingChange={handleRoomsChange} /> : null}
      {selectedSection?.id === 'staff' ? (
        <StaffSection onStaffChange={handleAdminDataChange} refreshKey={roomsVersion} />
      ) : null}
      {selectedSection?.id === 'managers' && canManageManagers ? (
        <ManagersSection onManagersChange={handleAdminDataChange} />
      ) : null}
      {selectedSection?.id === 'board' ? <BoardSettingsSection /> : null}
    </div>
  )
}
