import type { Policy } from '@athena/types'
import { Permission } from '@athena/types'

export const useAcl = () => {
  const authStore = useAuthStore()

  const isAdmin = computed(() => {
    return (authStore.tokenInfo?.permissions || []).includes(Permission.ADMIN)
  })

  const hasPermission = (permission: Permission): boolean => {
    if (!authStore.user) return false
    if (isAdmin.value) return true

    return (authStore.tokenInfo?.permissions || []).includes(permission)
  }

  const hasPolicy = (permission: Permission, policy: Policy): boolean => {
    if (!authStore.tokenInfo || !authStore.tokenInfo.policies) return false

    const userPoliciesForPerm = authStore.tokenInfo.policies[permission] || []
    return userPoliciesForPerm.includes(policy)
  }

  const can = (permission: Permission, policy?: Policy): boolean => {
    const hasPerm = hasPermission(permission)
    if (!hasPerm) return false

    if (!policy) return true

    return hasPolicy(permission, policy)
  }

  return {
    isAdmin,
    hasPermission,
    hasPolicy,
    can
  }
}
