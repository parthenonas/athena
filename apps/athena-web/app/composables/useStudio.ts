import type {
  Pageable,
  CourseResponse,
  CreateCourseRequest,
  UpdateCourseRequest,
  FilterCourseRequest
} from '@athena/types'

export const useStudio = () => {
  const { t } = useI18n()
  const toast = useToast()

  const fetchCourses = (params: FilterCourseRequest) => {
    return useApi<Pageable<CourseResponse>>('/api/courses', {
      method: 'GET',
      params,
      watch: [
        () => params.page,
        () => params.limit,
        () => params.search,
        () => params.sortBy,
        () => params.sortOrder
      ]
    })
  }

  const fetchCourse = (id: string) => {
    return useApi<CourseResponse>(`/api/courses/${id}`, {
      method: 'GET'
    })
  }

  const createCourse = async (payload: CreateCourseRequest) => {
    try {
      const data = await $api<CourseResponse>('/api/courses', {
        method: 'POST',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.courses.created'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.courses.create-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const updateCourse = async (id: string, payload: UpdateCourseRequest) => {
    try {
      const data = await $api<CourseResponse>(`/api/courses/${id}`, {
        method: 'PATCH',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.courses.updated'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.courses.update-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const deleteCourse = async (id: string) => {
    try {
      await $api(`/api/courses/${id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.courses.deleted'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.courses.delete-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  return {
    fetchCourses,
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse
  }
}
