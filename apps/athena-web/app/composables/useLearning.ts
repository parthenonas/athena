import type { StudentSubmissionRequest, StudentLessonView, StudentDashboardView } from '@athena/types'

export const useLearning = () => {
  const { t } = useI18n()
  const toast = useToast()

  const fetchMyDashboard = async () => {
    try {
      const data = await $api<StudentDashboardView[]>('/api/progress', {
        method: 'GET'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.learning.dashboard-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const fetchMyProgress = async (courseId: string) => {
    try {
      const data = await $api<StudentDashboardView>(`/api/progress/${courseId}`, {
        method: 'GET'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.learning.progress-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const fetchLesson = async (courseId: string, lessonId: string) => {
    try {
      const data = await $api<StudentLessonView>(`/api/progress/${courseId}/lesson/${lessonId}`, {
        method: 'GET'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.learning.lesson-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  const markAsViewed = async (courseId: string, lessonId: string, blockId: string) => {
    try {
      const data = await $api<{ status: string, score: number }>(`/api/progress/${courseId}/lessons/${lessonId}/blocks/${blockId}/view`, {
        method: 'POST'
      })
      return data
    } catch (error: unknown) {
      console.error(error)
      throw error
    }
  }

  const submitAssignment = async (courseId: string, lessonId: string, blockId: string, payload: StudentSubmissionRequest) => {
    try {
      const data = await $api<{ status: string }>(`/api/progress/${courseId}/lessons/${lessonId}/blocks/${blockId}/submit`, {
        method: 'POST',
        body: payload
      })

      toast.add({
        title: t('common.success'),
        description: t('toasts.learning.submission-sent'),
        color: 'success',
        icon: 'i-lucide-check-circle'
      })

      return data
    } catch (error: unknown) {
      console.error(error)
      toast.add({
        title: t('common.error'),
        description: t('toasts.learning.submission-error'),
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
      throw error
    }
  }

  return {
    fetchMyDashboard,
    fetchMyProgress,
    fetchLesson,
    markAsViewed,
    submitAssignment
  }
}
