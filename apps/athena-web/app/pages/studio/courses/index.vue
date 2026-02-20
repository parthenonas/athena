<script setup lang="ts">
import type { CourseResponse, FilterCourseRequest } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchCourses, deleteCourse, syncContent } = useStudio()
const router = useRouter()

const search = ref('')

const filters = reactive<FilterCourseRequest>({
  page: 1,
  limit: 10,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'DESC'
})

watchDebounced(search, (val) => {
  filters.search = val
  filters.page = 1
}, { debounce: 500, maxWait: 1000 })

const { data, status, refresh } = await fetchCourses(filters)

const loading = computed(() => status.value === 'pending')
const courses = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)

const columns = computed<TableColumn<CourseResponse>[]>(() => [
  { accessorKey: 'title', header: t('pages.courses.columns.title'), class: 'w-[40%]' },
  { accessorKey: 'tags', header: t('pages.courses.columns.tags') },
  { accessorKey: 'isPublished', header: t('pages.courses.columns.status') },
  { accessorKey: 'createdAt', header: t('pages.courses.columns.created-at') },
  { accessorKey: 'updatedAt', header: t('pages.courses.columns.updated-at') },
  { id: 'actions', header: '' }
])

const isSlideoverOpen = ref(false)
const selectedCourse = ref<CourseResponse | null>(null)

const openCreate = () => {
  selectedCourse.value = null
  isSlideoverOpen.value = true
}

const openEdit = (course: CourseResponse) => {
  selectedCourse.value = course
  isSlideoverOpen.value = true
}

const isDeleteOpen = ref(false)
const courseToDelete = ref<CourseResponse | null>(null)
const deleteLoading = ref(false)

const openDelete = (course: CourseResponse) => {
  courseToDelete.value = course
  isDeleteOpen.value = true
}

const onConfirmDelete = async () => {
  if (!courseToDelete.value) return
  deleteLoading.value = true
  try {
    await deleteCourse(courseToDelete.value.id)
    await refresh()
    isDeleteOpen.value = false
  } finally {
    deleteLoading.value = false
    courseToDelete.value = null
  }
}

const isSyncOpen = ref(false)
const syncLoading = ref(false)

const openSync = () => {
  isSyncOpen.value = true
}

const onConfirmSync = async () => {
  syncLoading.value = true
  try {
    await syncContent()
    isSyncOpen.value = false
  } finally {
    syncLoading.value = false
  }
}

const openBuilder = (course: CourseResponse) => {
  router.push(`/studio/courses/${course.id}`)
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex justify-between items-center gap-2">
      <div>
        <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {{ $t('pages.courses.title') }}
        </h1>
        <p class="text-gray-500">
          {{ $t('pages.courses.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="$t('pages.courses.sync')"
        color="error"
        variant="solid"
        @click="openSync"
      />
      <UButton
        icon="i-lucide-plus"
        :label="$t('pages.courses.create')"
        color="primary"
        variant="solid"
        @click="openCreate"
      />
    </div>

    <div class="flex gap-4">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="$t('common.search')"
        class="w-full sm:max-w-xs"
      />
    </div>

    <UTable
      :data="courses"
      :columns="columns"
      :loading="loading"
    >
      <template #title-cell="{ row }">
        <div
          class="flex flex-col py-2 cursor-pointer group"
          @click="openBuilder(row.original)"
        >
          <span class="font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
            {{ row.original.title }}
          </span>
        </div>
      </template>

      <template #tags-cell="{ row }">
        <div class="flex gap-1 mt-1">
          <UBadge
            v-for="tag in row.original.tags"
            :key="tag"
            variant="subtle"
            size="sm"
            color="neutral"
          >
            {{ tag }}
          </UBadge>
        </div>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-gray-500">
          {{ new Date(row.original.createdAt).toLocaleDateString() }}
        </span>
      </template>

      <template #updatedAt-cell="{ row }">
        <span class="text-sm text-gray-500">
          {{ new Date(row.original.updatedAt).toLocaleDateString() }}
        </span>
      </template>

      <template #isPublished-cell="{ row }">
        <UBadge
          :color="row.original.isPublished ? 'success' : 'warning'"
          variant="subtle"
          size="sm"
        >
          {{ row.original.isPublished ? $t('pages.courses.published') : $t('pages.courses.draft') }}
        </UBadge>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UTooltip :text="$t('pages.courses.builder')">
            <UButton
              icon="i-lucide-blocks"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openBuilder(row.original)"
            />
          </UTooltip>

          <UTooltip :text="$t('common.edit')">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openEdit(row.original)"
            />
          </UTooltip>

          <UTooltip :text="$t('common.delete')">
            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              size="xs"
              @click="openDelete(row.original)"
            />
          </UTooltip>
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

    <StudioCourseSlideover
      v-model="isSlideoverOpen"
      :course="selectedCourse"
      @success="refresh"
    />

    <ConfirmModal
      v-model:open="isDeleteOpen"
      danger
      :title="$t('pages.courses.delete-title')"
      :description="$t('pages.courses.delete-confirm')"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />

    <ConfirmModal
      v-model:open="isSyncOpen"
      danger
      :title="$t('pages.courses.sync-title')"
      :description="$t('pages.courses.sync-confirm')"
      :loading="syncLoading"
      @confirm="onConfirmSync"
    />
  </div>
</template>
