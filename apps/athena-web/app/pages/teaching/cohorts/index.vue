<script setup lang="ts">
import type { CohortResponse, FilterCohortRequest } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchCohorts, deleteCohort } = useTeaching()

const search = ref('')

const filters = reactive<FilterCohortRequest>({
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

const { data, status, refresh } = await fetchCohorts(filters)

const loading = computed(() => status.value === 'pending')
const cohorts = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)

const columns = computed<TableColumn<CohortResponse>[]>(() => [
  {
    accessorKey: 'name',
    header: t('pages.teaching.cohorts.columns.name'),
    class: 'w-[30%]'
  },
  {
    id: 'instructor',
    header: t('pages.teaching.cohorts.columns.instructor')
  },
  {
    id: 'dates',
    header: t('pages.teaching.cohorts.columns.dates')
  },
  { id: 'actions', header: '' }
])

const isSlideoverOpen = ref(false)
const selectedCohortId = ref<string | null>(null)

const openCreate = () => {
  selectedCohortId.value = null
  isSlideoverOpen.value = true
}

const openEdit = (item: CohortResponse) => {
  selectedCohortId.value = item.id
  isSlideoverOpen.value = true
}

const isDeleteOpen = ref(false)
const itemToDelete = ref<CohortResponse | null>(null)
const deleteLoading = ref(false)

const openDelete = (item: CohortResponse) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const onConfirmDelete = async () => {
  if (!itemToDelete.value) return
  deleteLoading.value = true
  try {
    await deleteCohort(itemToDelete.value.id)
    await refresh()
    isDeleteOpen.value = false
  } finally {
    deleteLoading.value = false
    itemToDelete.value = null
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {{ $t('pages.teaching.cohorts.title') }}
        </h1>
        <p class="text-gray-500">
          {{ $t('pages.teaching.cohorts.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="$t('pages.teaching.cohorts.create')"
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
      :data="cohorts"
      :columns="columns"
      :loading="loading"
    >
      <template #name-cell="{ row }">
        <NuxtLink
          :to="`/teaching/cohorts/${row.original.id}`"
          class="font-medium text-gray-900 dark:text-white hover:text-primary-500 hover:underline"
        >
          {{ row.original.name }}
        </NuxtLink>
      </template>

      <template #instructor-cell="{ row }">
        <TeachingInstructorBadge :instructor-id="row.original.instructorId!" />
      </template>

      <template #dates-cell="{ row }">
        <div class="flex flex-col text-xs text-gray-500">
          <span v-if="row.original.startDate">
            {{ new Date(row.original.startDate).toLocaleDateString() }}
          </span>
          <span v-if="row.original.endDate">
            - {{ new Date(row.original.endDate).toLocaleDateString() }}
          </span>
        </div>
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

    <TeachingCohortSlideover
      v-model="isSlideoverOpen"
      :cohort-id="selectedCohortId"
      @success="refresh"
    />

    <ConfirmModal
      v-model:open="isDeleteOpen"
      danger
      :title="$t('pages.teaching.cohorts.delete-title')"
      :description="$t('pages.teaching.cohorts.delete-confirm')"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
