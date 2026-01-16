<script setup lang="ts">
import type { CohortResponse } from '@athena/types'

const props = defineProps<{
  cohort: CohortResponse
}>()

const { fetchInstructor, fetchEnrollments } = useTeaching()

const { data: instructor, status } = await useAsyncData(
  `instructor-for-cohort-${props.cohort.id}`,
  async () => {
    if (!props.cohort.instructorId) return null
    return await fetchInstructor(props.cohort.instructorId)
  },
  {
    watch: [() => props.cohort.instructorId]
  }
)

const { data } = await fetchEnrollments({
  page: 1,
  limit: 10,
  cohortId: undefined,
  sortBy: 'enrolledAt',
  sortOrder: 'DESC' })

const total = computed(() => data.value?.meta?.total || 0)

const isLoading = computed(() => status.value === 'pending')
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2 text-gray-500 font-medium text-sm">
          <UIcon
            name="i-lucide-graduation-cap"
            class="w-4 h-4"
          />
          {{ $t('pages.teaching.cohorts.overview.instructor') }}
        </div>
      </template>

      <div
        v-if="isLoading"
        class="flex items-center gap-3"
      >
        <USkeleton class="h-10 w-10 rounded-full" />
        <div class="space-y-1">
          <USkeleton class="h-4 w-24" />
          <USkeleton class="h-3 w-16" />
        </div>
      </div>

      <div
        v-else-if="instructor"
        class="flex items-center gap-3"
      >
        <TeachingAccountBadge :account-id="instructor.ownerId" />
      </div>

      <div
        v-else
        class="text-gray-400 text-sm italic"
      >
        {{ $t('pages.teaching.cohorts.overview.not-assigned') }}
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2 text-gray-500 font-medium text-sm">
          <UIcon
            name="i-lucide-calendar-range"
            class="w-4 h-4"
          />
          {{ $t('pages.teaching.cohorts.overview.period') }}
        </div>
      </template>

      <div class="space-y-1">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500"> {{ $t('pages.teaching.cohorts.overview.begin') }}</span>
          <span class="font-medium">
            {{ cohort.startDate ? new Date(cohort.startDate).toLocaleDateString() : '-' }}
          </span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500"> {{ $t('pages.teaching.cohorts.overview.end') }}</span>
          <span class="font-medium">
            {{ cohort.endDate ? new Date(cohort.endDate).toLocaleDateString() : '-' }}
          </span>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2 text-gray-500 font-medium text-sm">
          <UIcon
            name="i-lucide-users"
            class="w-4 h-4"
          />
          {{ $t('pages.teaching.cohorts.overview.students-count') }}
        </div>
      </template>

      <div class="text-3xl font-bold text-primary-500">
        {{ total }}
      </div>
    </UCard>
  </div>
</template>
