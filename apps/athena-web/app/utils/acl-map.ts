import { Permission } from '@athena/types'

export const ACL_ROUTE_MAP: { prefix: string, permission: Permission }[] = [

  { prefix: '/admin/settings', permission: Permission.ADMIN },
  { prefix: '/admin/users', permission: Permission.ACCOUNTS_READ },
  { prefix: '/admin/roles', permission: Permission.ACCOUNTS_READ },
  { prefix: '/admin/files', permission: Permission.FILES_READ },
  { prefix: '/admin', permission: Permission.ADMIN },

  { prefix: '/studio/courses', permission: Permission.COURSES_READ },
  { prefix: '/studio/library', permission: Permission.LESSONS_CREATE },
  { prefix: '/studio/grading', permission: Permission.PROGRESS_UPDATE },
  { prefix: '/studio', permission: Permission.COURSES_READ },

  { prefix: '/teaching/cohorts', permission: Permission.COHORTS_READ },
  { prefix: '/teaching/instructors', permission: Permission.INSTRUCTORS_READ },
  { prefix: '/teaching', permission: Permission.COHORTS_READ }
]

export const getRequiredPermissionForPath = (path: string): Permission | null => {
  const match = ACL_ROUTE_MAP.find(route => path.startsWith(route.prefix))
  return match ? match.permission : null
}
