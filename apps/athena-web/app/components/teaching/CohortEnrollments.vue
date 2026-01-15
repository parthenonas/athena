<script setup lang="ts">
import { type FilterEnrollmentRequest, type EnrollmentResponse, EnrollmentStatus } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

const props = defineProps<{
  cohortId: string
}>()

const { t } = useI18n()
const { fetchEnrollments, deleteEnrollment } = useTeaching()

const search = ref('')

const filters = reactive<FilterEnrollmentRequest>({
  page: 1,
  limit: 10,
  cohortId: props.cohortId,
  sortBy: 'enrolledAt',
  sortOrder: 'DESC'
})

watchDebounced(search, (val) => {
  filters.search = val
  filters.page = 1
}, { debounce: 500, maxWait: 1000 })

const { data, status, refresh } = await fetchEnrollments(filters)

const loading = computed(() => status.value === 'pending')
const enrollments = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)

const columns = computed<TableColumn<EnrollmentResponse>[]>(() => [
  {
    id: 'student',
    header: t('pages.teaching.enrollments.columns.student')
  },
  {
    accessorKey: 'status',
    header: t('pages.teaching.enrollments.columns.status')
  },
  {
    accessorKey: 'createdAt',
    header: t('pages.teaching.enrollments.columns.joined')
  },
  { id: 'actions', header: '' }
])

const isSlideoverOpen = ref(false)
const selectedEnrollmentId = ref<string | null>(null)

const openCreate = () => {
  selectedEnrollmentId.value = null
  isSlideoverOpen.value = true
}

const openEdit = (item: EnrollmentResponse) => {
  selectedEnrollmentId.value = item.id
  isSlideoverOpen.value = true
}

const isDeleteOpen = ref(false)
const itemToDelete = ref<EnrollmentResponse | null>(null)
const deleteLoading = ref(false)

const openDelete = (item: EnrollmentResponse) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const onConfirmDelete = async () => {
  if (!itemToDelete.value) return
  deleteLoading.value = true
  try {
    await deleteEnrollment(itemToDelete.value.id)
    await refresh()
    isDeleteOpen.value = false
  } finally {
    deleteLoading.value = false
    itemToDelete.value = null
  }
}

const getStatusColor = (status: EnrollmentStatus) => {
  switch (status) {
    case EnrollmentStatus.Active: return 'success'
    case EnrollmentStatus.Completed: return 'primary'
    case EnrollmentStatus.Expelled: return 'error'
    default: return 'neutral'
  }
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
      <UButton
        icon="i-lucide-user-plus"
        :label="$t('pages.teaching.enrollments.create')"
        color="primary"
        variant="solid"
        @click="openCreate"
      />
    </div>

    <UTable
      :data="enrollments"
      :columns="columns"
      :loading="loading"
    >
      <template #student-cell="{ row }">
        <TeachingAccountBadge :account-id="row.original.ownerId" />
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :color="getStatusColor(row.original.status)"
          variant="subtle"
          size="sm"
        >
          {{ $t(`enrollment-statuses.${row.original.status}`) }}
        </UBadge>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-gray-500">
          {{ new Date(row.original.enrolledAt).toLocaleDateString() }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UTooltip :text="$t('common.edit')">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openEdit(row.original)"
            />
          </UTooltip>

          <UTooltip :text="$t('pages.teaching.enrollments.delete-title')">
            <UButton
              icon="i-lucide-user-minus"
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

    <TeachingEnrollmentSlideover
      v-model="isSlideoverOpen"
      :enrollment-id="selectedEnrollmentId"
      :initial-cohort-id="cohortId"
      @success="refresh"
    />

    <ConfirmModal
      v-model:open="isDeleteOpen"
      danger
      :title="$t('pages.teaching.enrollments.delete-title')"
      :description="$t('pages.teaching.enrollments.delete-confirm')"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
