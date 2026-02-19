<script setup lang="ts">
import { ProgressStatus } from '@athena/types'
import { useLearning } from '~/composables/useLearning'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const courseId = route.params.courseId as string

const { fetchMyProgress } = useLearning()
const toast = useToast()
const { t } = useI18n()

try {
  const progress = await fetchMyProgress(courseId)

  if (!progress || !progress.lessons || Object.keys(progress.lessons).length === 0) {
    throw new Error('No lessons found')
  }

  const lessons = progress.lessons
  let targetLessonId = ''

  const inProgressId = Object.keys(lessons).find(id => lessons[id]?.status === ProgressStatus.IN_PROGRESS)

  if (inProgressId) {
    targetLessonId = inProgressId
  } else {
    targetLessonId = Object.keys(lessons)[0]!
  }

  await navigateTo(`/learn/courses/${courseId}/lessons/${targetLessonId}`, { replace: true })
} catch (error) {
  console.error('[Course Router Error]:', error)
  toast.add({
    title: t('common.error'),
    description: t('toasts.learning.course-load-error'),
    color: 'error',
    icon: 'i-lucide-alert-circle'
  })

  await navigateTo('/learn', { replace: true })
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-[60vh] gap-4">
    <UIcon
      name="i-lucide-loader-2"
      class="w-10 h-10 animate-spin text-primary-500"
    />
    <p class="text-gray-500 font-medium">
      {{ $t('pages.learn.loading-course') }}
    </p>
  </div>
</template>
