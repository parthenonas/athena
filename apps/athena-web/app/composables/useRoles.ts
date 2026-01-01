import type {
  Pageable,
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  FilterRoleRequest
} from '@athena/types'

export const useRoles = () => {
  const toast = useToast()
  const { t } = useI18n()

  const fetchRoles = (params: FilterRoleRequest) => {
    return useApi<Pageable<RoleResponse>>('/api/roles', {
      method: 'GET',
      params
    })
  }

  const fetchRole = async (id: string) => {
    return await $api<RoleResponse>(`/api/roles/${id}`, { method: 'GET' })
  }

  const createRole = async (body: CreateRoleRequest) => {
    try {
      const data = await $api<RoleResponse>('/api/roles', {
        method: 'POST',
        body
      })

      toast.add({
        title: t('toasts.roles.created.title'),
        description: t('toasts.roles.created.description'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.roles.created.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const updateRole = async (id: string, body: UpdateRoleRequest) => {
    try {
      const data = await $api<RoleResponse>(`/api/roles/${id}`, {
        method: 'PATCH',
        body
      })

      toast.add({
        title: t('toasts.roles.updated.title'),
        description: t('toasts.roles.updated.description'),
        color: 'success',
        icon: 'i-lucide-save'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.roles.updated.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const deleteRole = async (id: string) => {
    try {
      await $api(`/api/roles/${id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('toasts.roles.deleted.title'),
        description: t('toasts.roles.deleted.description'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.roles.deleted.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  return {
    fetchRoles,
    fetchRole,
    createRole,
    updateRole,
    deleteRole
  }
}
