<script setup lang="ts">
import { ProgressStatus } from '@athena/types'
import { useLearning } from '~/composables/useLearning'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchMyDashboard } = useLearning()

const { data: courses, pending, error } = await useAsyncData(
  'student-dashboard-courses',
  () => fetchMyDashboard()
)

const getStatusColor = (status: ProgressStatus) => {
  switch (status) {
    case ProgressStatus.COMPLETED: return 'success'
    case ProgressStatus.IN_PROGRESS: return 'primary'
    default: return 'neutral'
  }
}

const getStatusValue = (status: ProgressStatus) => {
  switch (status) {
    case ProgressStatus.COMPLETED: return t('course-statuses.completed')
    case ProgressStatus.IN_PROGRESS: return t('course-statuses.in-progress')
    case ProgressStatus.NOT_STARTED: return t('course-statuses.not-started')
  }
}
</script>

<template>
  <UDashboardPanel grow>
    <UDashboardNavbar :title="$t('pages.dashboard.my-learning')" />

    <UDashboardPanelContent>
      <div
        v-if="pending"
        class="flex items-center justify-center h-64"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="w-8 h-8 animate-spin text-primary-500"
        />
      </div>

      <div
        v-else-if="error"
        class="flex flex-col items-center justify-center h-64 gap-4 text-error-500"
      >
        <UIcon
          name="i-lucide-alert-circle"
          class="w-12 h-12"
        />
        <p>{{ $t('common.error') }}</p>
      </div>

      <div
        v-else-if="!courses?.length"
        class="flex flex-col items-center justify-center h-64 gap-4 text-gray-500"
      >
        <UIcon
          name="i-lucide-book-dashed"
          class="w-12 h-12"
        />
        <p>{{ $t('pages.learn.no-courses') }}</p>
      </div>

      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4"
      >
        <UCard
          v-for="course in courses"
          :key="course.courseId"
          class="flex flex-col overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all duration-200"
        >
          <div class="h-40 bg-gray-200 dark:bg-gray-800 relative">
            <img
              v-if="course.courseCoverUrl"
              :src="course.courseCoverUrl"
              :alt="course.courseTitle"
              class="w-full h-full object-cover"
            >
            <div
              v-else
              class="w-full h-full bg-linear-to-br from-primary-500/20 to-primary-900/40 flex items-center justify-center"
            >
              <UIcon
                name="i-lucide-book-open"
                class="w-12 h-12 text-primary-500/50"
              />
            </div>

            <div class="absolute top-3 right-3">
              <UBadge
                :color="getStatusColor(course.status)"
                variant="solid"
                size="sm"
                class="font-semibold uppercase tracking-wider text-[10px]"
              >
                {{ getStatusValue(course.status) }}
              </UBadge>
            </div>
          </div>

          <div class="p-4 flex-1 flex flex-col gap-2">
            <h3 class="font-display font-bold text-lg text-gray-900 dark:text-white line-clamp-2">
              {{ course.courseTitle }}
            </h3>

            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <UIcon
                name="i-lucide-users"
                class="w-4 h-4 shrink-0"
              />
              <span class="truncate">{{ course.cohortName }}</span>
            </div>

            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <UIcon
                name="i-lucide-graduation-cap"
                class="w-4 h-4 shrink-0"
              />
              <span class="truncate">{{ course.instructorName }}</span>
            </div>
          </div>

          <template #footer>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
                  <span>{{ $t('pages.learn.progress') }}</span>
                  <span>{{ course.progressPercentage }}%</span>
                </div>
                <UMeter
                  :value="course.progressPercentage"
                  color="primary"
                  size="sm"
                />
                <div class="text-xs text-gray-500 text-right mt-1">
                  {{ $t('pages.learn.total-score') }}: <span class="font-bold text-gray-700 dark:text-gray-200">{{ course.totalScore }}</span>
                </div>
              </div>

              <UButton
                :to="`/learn/courses/${course.courseId}`"
                :color="course.status === ProgressStatus.COMPLETED ? 'neutral' : 'primary'"
                :variant="course.status === ProgressStatus.COMPLETED ? 'solid' : 'solid'"
                block
                :icon="course.status === ProgressStatus.COMPLETED ? 'i-lucide-rotate-ccw' : 'i-lucide-play'"
                :label="course.status === ProgressStatus.COMPLETED ? $t('pages.learn.review') : (course.progressPercentage > 0 ? $t('pages.learn.continue') : $t('pages.learn.start'))"
              />
            </div>
          </template>
        </UCard>
      </div>
    </UDashboardPanelContent>
  </UDashboardPanel>
</template>
