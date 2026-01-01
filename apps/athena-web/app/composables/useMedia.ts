import type { Pageable, FileResponse, FilterFileRequest, FileAccess, StorageUsageResponse, MediaQuotaRequest } from '@athena/types'

export const useMedia = () => {
  const toast = useToast()
  const { t } = useI18n()

  const fetchFiles = (params: FilterFileRequest) => {
    return useApi<Pageable<FileResponse>>('/api/media', {
      method: 'GET',
      params
    })
  }

  const uploadFile = async (file: File, access: FileAccess) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('access', access)

    try {
      const data = await $api<FileResponse>('/api/media', {
        method: 'POST',
        body: formData
      })

      toast.add({
        title: t('toasts.media.uploaded.title', 'Uploaded'),
        description: t('toasts.media.uploaded.description', 'File saved'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.media.uploaded.error', 'Upload failed'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const deleteFile = async (id: string) => {
    try {
      await $api(`/api/media/${id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('toasts.media.deleted.title', 'Deleted'),
        description: t('toasts.media.deleted.description', 'File removed'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.media.deleted.error', 'Delete failed'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  const downloadFile = async (file: FileResponse) => {
    if (file.access === 'public') {
      window.open(file.url, '_blank')
      return
    }

    try {
      const blob = await $api<Blob>(file.url, {
        method: 'GET',
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.originalName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Download error', e)
      toast.add({
        title: t('common.error'),
        description: 'Failed to download file',
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  const formatBytes = (bytes: string | number, decimals = 2) => {
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

    const value = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes

    if (!value || value === 0) return '0 Bytes'

    const i = Math.floor(Math.log(value) / Math.log(k))

    return `${parseFloat((value / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const fetchUsage = () => {
    return useApi<StorageUsageResponse>('/api/media/usage', {
      method: 'GET'
    })
  }

  const fetchQuotas = () => {
    return useApi<MediaQuotaRequest[]>('/api/media/quotas', {
      method: 'GET'
    })
  }

  const setQuota = async (roleName: string, limitBytes: number) => {
    try {
      const data = await $api<MediaQuotaRequest>('/api/media/quotas', {
        method: 'POST',
        body: { roleName, limitBytes }
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.quotas.updated', { role: roleName }),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.quotas.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const deleteQuota = async (roleName: string) => {
    try {
      await $api(`/media/quotas/${roleName}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.quotas.deleted'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.quotas.error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  return {
    fetchFiles,
    uploadFile,
    deleteFile,
    downloadFile,
    formatBytes,
    fetchUsage,
    fetchQuotas,
    setQuota,
    deleteQuota
  }
}
