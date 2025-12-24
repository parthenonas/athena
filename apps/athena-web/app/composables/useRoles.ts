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

  const fetchRole = (id: string) => {
    return useApi<RoleResponse>(`/roles/${id}`, { method: 'GET' })
  }

  const createRole = async (body: CreateRoleRequest) => {
    const { error } = await useApi<RoleResponse>('/roles', {
      method: 'POST',
      body
    })

    if (error.value) throw error.value
    toast.add({ title: t('common.success'), color: 'success' })
  }

  const updateRole = async (id: string, body: UpdateRoleRequest) => {
    const { error } = await useApi<RoleResponse>(`/roles/${id}`, {
      method: 'PATCH',
      body
    })

    if (error.value) throw error.value
    toast.add({ title: t('common.success'), color: 'success' })
  }

  const deleteRole = async (id: string) => {
    const { error } = await useApi(`/roles/${id}`, {
      method: 'DELETE'
    })

    if (error.value) throw error.value
    toast.add({ title: t('common.deleted'), color: 'success' })
  }

  return {
    fetchRoles,
    fetchRole,
    createRole,
    updateRole,
    deleteRole
  }
}
