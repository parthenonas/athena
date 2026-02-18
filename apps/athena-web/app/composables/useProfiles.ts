import type { CreateProfileRequest, UpdateProfileRequest, ProfileResponse } from '@athena/types'

export const useProfiles = () => {
  const toast = useToast()
  const { t } = useI18n()

  const fetchProfile = async (ownerId: string) => {
    return await $api<ProfileResponse>(`/api/profiles/${ownerId}`, { method: 'GET' })
  }

  const createProfile = async (ownerId: string, body: CreateProfileRequest) => {
    try {
      const data = await $api<ProfileResponse>(`/api/profiles/${ownerId}`, {
        method: 'POST',
        body
      })

      toast.add({
        title: t('toasts.profiles.created.title'),
        description: t('toasts.profiles.created.description'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.profiles.created.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  const updateProfile = async (ownerId: string, body: UpdateProfileRequest) => {
    try {
      const data = await $api<ProfileResponse>(`/api/profiles/${ownerId}`, {
        method: 'PATCH',
        body
      })

      toast.add({
        title: t('toasts.profiles.updated.title'),
        description: t('toasts.profiles.updated.description'),
        color: 'success',
        icon: 'i-lucide-save'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.profiles.updated.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  const fetchMe = async () => {
    return await $api<ProfileResponse>('/api/profiles/me', { method: 'GET' })
  }

  const createMe = async (body: CreateProfileRequest) => {
    try {
      const data = await $api<ProfileResponse>('/api/profiles/me', {
        method: 'POST',
        body
      })

      toast.add({
        title: t('toasts.profiles.me-created.title'),
        description: t('toasts.profiles.me-created.description'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.profiles.me-created.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const updateMe = async (body: UpdateProfileRequest) => {
    try {
      const data = await $api<ProfileResponse>('/api/profiles/me', {
        method: 'PATCH',
        body
      })

      toast.add({
        title: t('toasts.profiles.me-updated.title'),
        description: t('toasts.profiles.me-updated.description'),
        color: 'success',
        icon: 'i-lucide-save'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.profiles.me-updated.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  return {
    fetchProfile,
    createProfile,
    updateProfile,
    fetchMe,
    createMe,
    updateMe
  }
}
