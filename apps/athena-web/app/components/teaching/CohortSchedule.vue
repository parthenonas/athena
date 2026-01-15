<script setup lang="ts">
import type { CohortResponse, LessonResponse, ScheduleResponse, FilterLessonRequest } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

const props = defineProps<{
  cohort: CohortResponse
}>()

const { t } = useI18n()
const { fetchLessons } = useStudio()
const { fetchAllSchedules } = useTeaching()

const search = ref('')

const filters = reactive<FilterLessonRequest>({
  page: 1,
  limit: 10,
  courseId: props.cohort.courseId,
  search: '',
  sortBy: 'order',
  sortOrder: 'ASC'
})

watchDebounced(search, (val) => {
  filters.search = val
  filters.page = 1
}, { debounce: 500, maxWait: 1000 })

const { data: lessonsData, status: lessonsStatus } = await fetchLessons(filters)

const { data: allSchedules, status: schedulesStatus, refresh: refreshSchedules } = await useAsyncData(
  `all-schedules-cohort-${props.cohort.id}`,
  () => fetchAllSchedules(props.cohort.id)
)

const loading = computed(() => lessonsStatus.value === 'pending' || schedulesStatus.value === 'pending')
const total = computed(() => lessonsData.value?.meta?.total || 0)

const rows = computed(() => {
  const lessons = lessonsData.value?.data || []
  const schedules = allSchedules.value || []

  return lessons.map((lesson) => {
    const schedule = schedules.find(s => s.lessonId === lesson.id)
    return {
      lesson,
      schedule,
      id: lesson.id
    }
  })
})

const columns = computed<TableColumn<{ lesson: LessonResponse, schedule?: ScheduleResponse }>[]>(() => [
  {
    accessorKey: 'lesson.title',
    header: t('pages.teaching.schedule.columns.lesson'),
    class: 'w-[40%]'
  },
  {
    id: 'dates',
    header: t('pages.teaching.schedule.columns.dates')
  },
  {
    id: 'status',
    header: t('pages.teaching.schedule.columns.status')
  },
  {
    id: 'actions',
    header: ''
  }
])

const isSlideoverOpen = ref(false)
const selectedLesson = ref<{ id: string, title: string } | null>(null)
const selectedScheduleId = ref<string | null>(null)

const { formatDate } = useAppDate()

const openCreate = (lesson: LessonResponse) => {
  selectedLesson.value = { id: lesson.id, title: lesson.title }
  selectedScheduleId.value = null
  isSlideoverOpen.value = true
}

const openEdit = (lesson: LessonResponse, schedule: ScheduleResponse) => {
  selectedLesson.value = { id: lesson.id, title: lesson.title }
  selectedScheduleId.value = schedule.id
  isSlideoverOpen.value = true
}

const onSlideoverSuccess = () => {
  refreshSchedules()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <div class="flex gap-4 w-full">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          :placeholder="$t('common.search')"
          class="w-full sm:max-w-xs"
        />
      </div>
    </div>

    <UTable
      :data="rows"
      :columns="columns"
      :loading="loading"
    >
      <template #lesson-title-cell="{ row }">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-file-text"
            class="w-4 h-4 text-gray-400"
          />
          <span class="font-medium text-gray-900 dark:text-white">
            {{ row.original.lesson.title }}
          </span>
        </div>
      </template>

      <template #dates-cell="{ row }">
        <div
          v-if="row.original.schedule"
          class="text-sm"
        >
          <div
            v-if="row.original.schedule.isOpenManually"
            class="text-primary-500 font-medium"
          >
            {{ $t('pages.teaching.schedule.manual') }}
          </div>
          <div
            v-else
            class="flex flex-col text-gray-500"
          >
            <span v-if="row.original.schedule.startAt">
              {{ formatDate(row.original.schedule.startAt) }}
            </span>
            <span
              v-else
              class="text-gray-300"
            >...</span>

            <span
              v-if="row.original.schedule.endAt"
            >
              → {{ formatDate(row.original.schedule.endAt) }}
            </span>
          </div>
        </div>
        <div
          v-else
          class="text-gray-400 text-sm italic"
        >
          {{ $t('pages.teaching.schedule.not-scheduled') }}
        </div>
      </template>

      <template #status-cell="{ row }">
        <div v-if="row.original.schedule">
          <UBadge
            v-if="row.original.schedule.isOpenManually"
            color="primary"
            variant="subtle"
            :label="$t('schedule-statuses.open')"
          />
          <UBadge
            v-else-if="row.original.schedule.startAt"
            color="neutral"
            variant="subtle"
            label="Auto"
          />
          <UBadge
            v-else-if="!row.original.schedule.isOpenManually && !row.original.schedule.startAt"
            color="error"
            variant="subtle"
            :label="$t('schedule-statuses.closed')"
          />
        </div>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UButton
            v-if="row.original.schedule"
            icon="i-lucide-pencil"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="openEdit(row.original.lesson, row.original.schedule)"
          />

          <UButton
            v-else
            icon="i-lucide-calendar-plus"
            size="xs"
            color="primary"
            variant="soft"
            :label="$t('pages.teaching.schedule.create-title')"
            @click="openCreate(row.original.lesson)"
          />
        </div>
      </template>
    </UTable>

    <div class="flex justify-end">
      <UPagination
        v-model="filters.page"
        :total="total"
        :page-count="filters.limit"
      />
    </div>

    <TeachingScheduleSlideover
      v-if="selectedLesson"
      v-model="isSlideoverOpen"
      :schedule-id="selectedScheduleId"
      :cohort-id="cohort.id"
      :lesson-id="selectedLesson.id"
      :lesson-title="selectedLesson.title"
      @success="onSlideoverSuccess"
    />
  </div>
</template>
