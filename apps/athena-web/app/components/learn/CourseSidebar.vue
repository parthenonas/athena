<script setup lang="ts">
import { ProgressStatus, type StudentDashboardView } from '@athena/types'

const props = defineProps<{
  courseProgress: StudentDashboardView | null
  activeLessonId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', lessonId: string): void
}>()

interface LessonListItem {
  id: string
  title: string
  status: ProgressStatus
}

const lessonsList = computed(() => {
  if (!props.courseProgress?.lessons) return []

  return Object.entries(props.courseProgress.lessons).map(([id, data]) => ({
    id,
    title: data.title,
    status: data.status
  } as LessonListItem))
})

const getIconForStatus = (status: ProgressStatus) => {
  switch (status) {
    case ProgressStatus.COMPLETED: return 'i-lucide-check-circle'
    case ProgressStatus.LOCKED: return 'i-lucide-lock'
    default: return 'i-lucide-circle'
  }
}

const getIconColorForStatus = (status: ProgressStatus, isActive: boolean) => {
  if (status === ProgressStatus.COMPLETED) return 'text-success-500'
  if (status === ProgressStatus.LOCKED) return 'text-gray-400 dark:text-gray-600'
  if (isActive) return 'text-primary-500'
  return 'text-gray-400'
}

const handleSelect = (lesson: LessonListItem) => {
  if (lesson.status === ProgressStatus.LOCKED) return
  emit('select', lesson.id)
}
</script>

<template>
  <div class="flex-1 overflow-y-auto flex flex-col p-0">
    <div class="px-2 mb-2">
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {{ $t('pages.learn.syllabus') }}
      </span>
    </div>

    <div
      v-if="!courseProgress"
      class="flex justify-center p-4"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin w-5 h-5 text-primary-500"
      />
    </div>

    <div
      v-else
      class="space-y-1"
    >
      <div
        v-for="(lesson, index) in lessonsList"
        :key="lesson.id"
        class="group flex items-center justify-between px-2.5 py-2 rounded-md transition-colors text-sm font-medium relative"
        :class="[
          lesson.status === ProgressStatus.LOCKED
            ? 'opacity-60 cursor-not-allowed text-gray-500 dark:text-gray-400'
            : 'cursor-pointer',
          activeLessonId === lesson.id && lesson.status !== ProgressStatus.LOCKED
            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400'
            : lesson.status !== ProgressStatus.LOCKED
              ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              : ''
        ]"
        @click="handleSelect(lesson)"
      >
        <div class="flex items-center gap-2 min-w-0 transition-all">
          <UIcon
            :name="getIconForStatus(lesson.status)"
            class="w-4 h-4 shrink-0"
            :class="getIconColorForStatus(lesson.status, activeLessonId === lesson.id)"
          />
          <span class="truncate">{{ index + 1 }}. {{ lesson.title }}</span>
        </div>

        <UIcon
          v-if="activeLessonId === lesson.id && lesson.status !== ProgressStatus.LOCKED"
          name="i-lucide-chevron-right"
          class="w-4 h-4 text-primary-500"
        />
      </div>
    </div>
  </div>
</template>
