import type {
  Pageable,
  CourseResponse,
  CreateCourseRequest,
  UpdateCourseRequest,
  FilterCourseRequest,
  LessonResponse,
  CreateLessonRequest,
  UpdateLessonRequest,
  FilterLessonRequest,
  BlockResponse,
  CreateBlockRequest,
  UpdateBlockRequest,
  BlockDryRunRequest
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

  const fetchLessons = (params: FilterLessonRequest) => {
    return useApi<Pageable<LessonResponse>>('/api/lessons', {
      method: 'GET',
      params,
      watch: [
        () => params.page,
        () => params.limit,
        () => params.search,
        () => params.courseId
      ]
    })
  }

  const fetchAllLessons = async (courseId: string) => {
    let page = 1
    const limit = 100
    let allLessons: LessonResponse[] = []
    let hasMore = true

    try {
      while (hasMore) {
        const response = await $api<Pageable<LessonResponse>>('/api/lessons', {
          method: 'GET',
          params: {
            courseId,
            page,
            limit,
            sortBy: 'order',
            sortOrder: 'ASC'
          }
        })

        allLessons = [...allLessons, ...response.data]

        if (response.meta.page < response.meta.pages) {
          page++
        } else {
          hasMore = false
        }
      }

      return allLessons
    } catch (error) {
      console.error('Failed to fetch all lessons', error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.lessons.fetch-error'),
        color: 'error'
      })
      throw error
    }
  }

  const createLesson = async (payload: CreateLessonRequest) => {
    try {
      const data = await $api<LessonResponse>('/api/lessons', {
        method: 'POST',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.lessons.created'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.lessons.create-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const updateLesson = async (id: string, payload: UpdateLessonRequest) => {
    try {
      const data = await $api<LessonResponse>(`/api/lessons/${id}`, {
        method: 'PATCH',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.lessons.updated'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.lessons.update-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const deleteLesson = async (id: string) => {
    try {
      await $api(`/api/lessons/${id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.lessons.deleted'),
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.lessons.delete-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const fetchBlocks = async (lessonId: string) => {
    const data = await $api<BlockResponse[]>(`/api/blocks/lesson/${lessonId}`, {
      method: 'GET'
    })

    return data
  }

  const createBlock = async (payload: CreateBlockRequest) => {
    try {
      const data = await $api<BlockResponse>('/api/blocks', {
        method: 'POST',
        body: payload
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.blocks.create-error'),
        color: 'error'
      })
      throw error
    }
  }

  const updateBlock = async (id: string, payload: UpdateBlockRequest) => {
    try {
      const data = await $api<BlockResponse>(`/api/blocks/${id}`, {
        method: 'PATCH',
        body: payload
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.blocks.update-error'),
        color: 'error'
      })
      throw error
    }
  }

  const deleteBlock = async (id: string) => {
    try {
      await $api(`/api/blocks/${id}`, {
        method: 'DELETE'
      })
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.blocks.delete-error'),
        color: 'error'
      })
      throw error
    }
  }

  const reorderBlock = async (id: string, newOrderIndex: number) => {
    return $api(`/api/blocks/${id}/reorder`, {
      method: 'PATCH',
      body: { newOrderIndex }
    })
  }

  const runBlockCode = async (payload: BlockDryRunRequest) => {
    return $api('/api/blocks/dry-run', {
      method: 'POST',
      body: payload
    })
  }

  return {
    fetchCourses,
    fetchCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    fetchLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    fetchAllLessons,
    fetchBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlock,
    runBlockCode
  }
}
