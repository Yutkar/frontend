import type { ServiceType } from '@shared/types'
import { getServiceTypeLabel } from '@shared/utils'

const serviceTypeIds: ServiceType[] = [
  'registration',
  'consultation',
  'diagnostics',
  'laboratory',
  'pharmacy',
  'billing',
]

export const serviceTypeOptions: Array<{
  id: ServiceType
  label: string
}> = serviceTypeIds.map((id) => ({
  id,
  label: getServiceTypeLabel(id),
}))
