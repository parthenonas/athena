<script setup lang="ts">
import type { StudentDashboardResponse } from '~/composables/useLearning'

const props = defineProps<{
  courseProgress: StudentDashboardResponse | null
  activeLessonId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', lessonId: string): void
}>()

const lessonsList = computed(() => {
  if (!props.courseProgress?.lessons) return []

  // В объекте ключи - это ID уроков. Допустим, бэкенд возвращает их в правильном порядке
  // Если нет - нам нужно добавить поле orderIndex в ответ дашборда на бэке.
  return Object.entries(props.courseProgress.lessons).map(([id, data]) => ({
    id,
    title: `Lesson ${id.substring(0, 4)}`, // TODO: На бэке в StudentDashboardResponse нет названия урока! Нужно добавить.
    status: data.status // "LOCKED", "IN_PROGRESS", "COMPLETED"
  }))
})

const getIconForStatus = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'i-lucide-check-circle'
    case 'LOCKED': return 'i-lucide-lock'
    default: return 'i-lucide-circle'
  }
}

const getIconColorForStatus = (status: string, isActive: boolean) => {
  if (status === 'COMPLETED') return 'text-success-500'
  if (status === 'LOCKED') return 'text-gray-400 dark:text-gray-600'
  if (isActive) return 'text-primary-500'
  return 'text-gray-400'
}

const handleSelect = (lesson: any) => {
  if (lesson.status === 'LOCKED') return
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
          lesson.status === 'LOCKED'
            ? 'opacity-60 cursor-not-allowed text-gray-500 dark:text-gray-400'
            : 'cursor-pointer',
          activeLessonId === lesson.id && lesson.status !== 'LOCKED'
            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400'
            : lesson.status !== 'LOCKED'
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
          v-if="activeLessonId === lesson.id && lesson.status !== 'LOCKED'"
          name="i-lucide-chevron-right"
          class="w-4 h-4 text-primary-500"
        />
      </div>
    </div>
  </div>
</template>
