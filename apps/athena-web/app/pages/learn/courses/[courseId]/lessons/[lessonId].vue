<script setup lang="ts">
import { ProgrammingLanguage } from '@athena/types'
import { useLearning } from '~/composables/useLearning'
import { useSocketStore } from '~/stores/socket.store'

definePageMeta({
  layout: 'player'
})

const route = useRoute()
const router = useRouter()
const courseId = route.params.courseId as string
const lessonId = route.params.lessonId as string

const { fetchLesson, fetchMyProgress, markAsViewed, submitAssignment } = useLearning()
const socketStore = useSocketStore()

const [
  { data: lesson, pending: lessonPending, refresh: refreshLesson },
  { data: progress, refresh: refreshProgress }
] = await Promise.all([
  useAsyncData(`lesson-${lessonId}`, () => fetchLesson(courseId, lessonId)),
  useAsyncData(`progress-${courseId}`, () => fetchMyProgress(courseId))
])

const executionResults = ref<Record<string, { isRunning: boolean, output: string }>>({})

const handleViewed = async (blockId: string) => {
  try {
    await markAsViewed(courseId, lessonId, blockId)
    await Promise.all([refreshLesson(), refreshProgress()])
  } catch (error) {
    console.error('Failed to mark block as viewed', error)
  }
}

const handleSubmit = async (blockId: string, payload: { code: string }) => {
  try {
    await submitAssignment(courseId, lessonId, blockId, {
      ...payload,
      language: ProgrammingLanguage.Python,
      socketId: socketStore.socketId || ''
    })
    await Promise.all([refreshLesson(), refreshProgress()])
  } catch (error) {
    console.error('Failed to submit assignment', error)
  }
}

const handleRun = async (blockId: string, _code: string) => {
  executionResults.value[blockId] = { isRunning: true, output: '' }
  setTimeout(() => {
    executionResults.value[blockId] = { isRunning: false, output: 'Executed successfully! (Mock)' }
  }, 1500)
}

onMounted(() => {
  socketStore.connect()
  socketStore.socket?.on('execution_result', async (data) => {
    if (data.courseId === courseId && data.lessonId === lessonId) {
      await Promise.all([refreshLesson(), refreshProgress()])
    }
  })
})

const onLessonSelect = (id: string) => {
  router.push(`/learn/courses/${courseId}/lessons/${id}`)
}
</script>

<template>
  <UPage>
    <template #left>
      <UPageAside>
        <div class="flex items-start gap-2 mb-6">
          <UTooltip :text="$t('common.back')">
            <UButton
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              to="/learn"
              class="mt-0.5"
            />
          </UTooltip>
          <span class="font-display font-bold text-lg text-gray-900 dark:text-white leading-tight">
            {{ progress?.courseTitle || $t('pages.learn.loading') }}
          </span>
        </div>

        <LearnCourseSidebar
          :course-progress="progress || null"
          :active-lesson-id="lessonId"
          @select="onLessonSelect"
        />

        <div
          v-if="progress"
          class="flex flex-col w-full gap-1.5 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800"
        >
          <div class="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>{{ $t('pages.learn.progress') }}</span>
            <span>{{ progress.progressPercentage }}%</span>
          </div>
          <UMeter
            :value="progress.progressPercentage"
            color="primary"
            size="sm"
          />
        </div>
      </UPageAside>
    </template>

    <div class="relative min-h-[50vh]">
      <div
        v-if="lessonPending && !lesson"
        class="absolute inset-0 flex items-center justify-center"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="w-8 h-8 animate-spin text-primary-500"
        />
      </div>

      <template v-else-if="lesson">
        <UPageHeader :title="lesson.title" />

        <UPageBody>
          <div
            v-if="lesson.goals"
            class="p-5 bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/50 rounded-xl text-sm italic text-gray-700 dark:text-gray-300 mb-8"
          >
            <div class="font-semibold not-italic mb-1 flex items-center gap-2">
              <UIcon
                name="i-lucide-target"
                class="w-4 h-4 text-primary-500"
              />
              {{ $t('pages.learn.lesson-goals') }}:
            </div>
            {{ lesson.goals }}
          </div>

          <div class="flex flex-col gap-2 relative">
            <div class="absolute left-3 top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-800 -z-10" />

            <LearnBlockRenderer
              v-for="block in lesson.blocks"
              :key="block.blockId"
              :block="block"
              :is-running="executionResults[block.blockId]?.isRunning"
              :output="executionResults[block.blockId]?.output"
              @viewed="handleViewed"
              @submit="handleSubmit"
              @run="handleRun"
            />
          </div>

          <div
            v-if="lesson.visibleBlocksCount === lesson.totalBlocks && lesson.blocks[lesson.blocks.length - 1]?.progress?.status === 'GRADED'"
            class="mt-16 p-8 text-center bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-900 rounded-2xl flex flex-col items-center gap-3"
          >
            <div class="w-12 h-12 bg-success-100 dark:bg-success-900/50 rounded-full flex items-center justify-center">
              <UIcon
                name="i-lucide-party-popper"
                class="w-6 h-6 text-success-500"
              />
            </div>
            <h3 class="font-display font-bold text-xl text-gray-900 dark:text-white">
              {{ $t('pages.learn.lesson-completed-title') }}
            </h3>
            <p class="text-sm text-gray-500 max-w-md">
              {{ $t('pages.learn.lesson-completed-desc') }}
            </p>
            <UButton
              class="mt-4"
              color="success"
              variant="soft"
              :label="$t('pages.learn.back-to-dashboard')"
              to="/learn"
            />
          </div>
        </UPageBody>
      </template>
    </div>
  </UPage>
</template>
