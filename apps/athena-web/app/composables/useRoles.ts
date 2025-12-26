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
    return useApi<Pageable<RoleResponse>>('/roles', {
      method: 'GET',
      params
    })
  }

  const fetchRole = async (id: string) => {
    return await $api<RoleResponse>(`/roles/${id}`, { method: 'GET' })
  }

  const createRole = async (body: CreateRoleRequest) => {
    const data = await $api<RoleResponse>('/roles', {
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
  }

  const updateRole = async (id: string, body: UpdateRoleRequest) => {
    const data = await $api<RoleResponse>(`/roles/${id}`, {
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
  }

  const deleteRole = async (id: string) => {
    await $api(`/roles/${id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: t('toasts.roles.deleted.title'),
      description: t('toasts.roles.deleted.description'),
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
  }

  return {
    fetchRoles,
    fetchRole,
    createRole,
    updateRole,
    deleteRole
  }
}
