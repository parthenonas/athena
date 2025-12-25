import type {
  Pageable,
  AccountResponse,
  CreateAccountRequest,
  UpdateAccountRequest,
  FilterAccountRequest
} from '@athena/types'

export const useAccounts = () => {
  const toast = useToast()
  const { t } = useI18n()

  const fetchAccounts = (params: FilterAccountRequest) => {
    return useApi<Pageable<AccountResponse>>('/accounts', {
      method: 'GET',
      params
    })
  }

  const fetchAccount = async (id: string) => {
    return await $api<AccountResponse>(`/accounts/${id}`, { method: 'GET' })
  }

  const createAccount = async (body: CreateAccountRequest) => {
    const data = await $api<AccountResponse>('/accounts', {
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
  }

  const updateAccount = async (id: string, body: UpdateAccountRequest) => {
    const data = await $api<AccountResponse>(`/accounts/${id}`, {
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
  }

  const deleteAccount = async (id: string) => {
    await $api(`/accounts/${id}`, {
      method: 'DELETE'
    })

    toast.add({
      title: t('toasts.accounts.deleted.title'),
      description: t('toasts.accounts.deleted.description'),
      color: 'success',
      icon: 'i-lucide-trash-2'
    })
  }

  return {
    fetchAccounts,
    fetchAccount,
    createAccount,
    updateAccount,
    deleteAccount
  }
}
