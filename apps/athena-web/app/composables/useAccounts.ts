import type {
  Pageable,
  AccountResponse,
  CreateAccountRequest,
  UpdateAccountRequest,
  FilterAccountRequest,
  ChangePasswordRequest
} from '@athena/types'

export const useAccounts = () => {
  const toast = useToast()
  const { t } = useI18n()

  const fetchAccounts = (params: FilterAccountRequest) => {
    return useApi<Pageable<AccountResponse>>('/api/accounts', {
      method: 'GET',
      params
    })
  }

  const fetchAccount = async (id: string) => {
    return await $api<AccountResponse>(`/api/accounts/${id}`, { method: 'GET' })
  }

  const createAccount = async (body: CreateAccountRequest) => {
    try {
      const data = await $api<AccountResponse>('/api/accounts', {
        method: 'POST',
        body
      })

      toast.add({
        title: t('toasts.accounts.created.title'),
        description: t('toasts.accounts.created.description'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.accounts.created.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  const updateAccount = async (id: string, body: UpdateAccountRequest) => {
    try {
      const data = await $api<AccountResponse>(`/api/accounts/${id}`, {
        method: 'PATCH',
        body
      })

      toast.add({
        title: t('toasts.accounts.updated.title'),
        description: t('toasts.accounts.updated.description'),
        color: 'success',
        icon: 'i-lucide-save'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.accounts.updated.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  const deleteAccount = async (id: string) => {
    try {
      await $api(`/api/accounts/${id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('toasts.accounts.deleted.title'),
        description: t('toasts.accounts.deleted.description'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.accounts.deleted.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  const changePassword = async (payload: ChangePasswordRequest) => {
    try {
      await $api('/api/accounts/me/password', {
        method: 'PATCH',
        body: payload
      })
      toast.add({
        title: t('common.success'),
        description: t('pages.settings.password-changed'),
        color: 'success',
        icon: 'i-lucide-key'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.accounts.password-changed.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  return {
    fetchAccounts,
    fetchAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    changePassword
  }
}
