<script setup lang="ts">
import type { InstructorResponse, FilterInstructorRequest } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchInstructors, deleteInstructor } = useTeaching()

const search = ref('')

const filters = reactive<FilterInstructorRequest>({
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

const { data, status, refresh } = await fetchInstructors(filters)

const loading = computed(() => status.value === 'pending')
const instructors = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)

const columns = computed<TableColumn<InstructorResponse>[]>(() => [
  {
    id: 'user',
    header: t('pages.teaching.instructors.columns.user')
  },
  {
    accessorKey: 'title',
    header: t('pages.teaching.instructors.columns.title'),
    class: 'w-[30%]'
  },
  {
    accessorKey: 'createdAt',
    header: t('pages.teaching.instructors.columns.created-at')
  },
  { id: 'actions', header: '' }
])

const isSlideoverOpen = ref(false)
const selectedInstructorId = ref<string | null>(null)

const openCreate = () => {
  selectedInstructorId.value = null
  isSlideoverOpen.value = true
}

const openEdit = (item: InstructorResponse) => {
  selectedInstructorId.value = item.id
  isSlideoverOpen.value = true
}

const isDeleteOpen = ref(false)
const itemToDelete = ref<InstructorResponse | null>(null)
const deleteLoading = ref(false)

const openDelete = (item: InstructorResponse) => {
  itemToDelete.value = item
  isDeleteOpen.value = true
}

const onConfirmDelete = async () => {
  if (!itemToDelete.value) return
  deleteLoading.value = true
  try {
    await deleteInstructor(itemToDelete.value.id)
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
          {{ $t('pages.teaching.instructors.title') }}
        </h1>
        <p class="text-gray-500">
          {{ $t('pages.teaching.instructors.subtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="$t('pages.teaching.instructors.create')"
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
      :data="instructors"
      :columns="columns"
      :loading="loading"
    >
      <template #user-cell="{ row }">
        <TeachingAccountBadge :account-id="row.original.ownerId" />
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-gray-500">
          {{ new Date(row.original.createdAt).toLocaleDateString() }}
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

    <TeachingInstructorSlideover
      v-model="isSlideoverOpen"
      :instructor-id="selectedInstructorId"
      @success="refresh"
    />

    <ConfirmModal
      v-model:open="isDeleteOpen"
      danger
      :title="$t('pages.teaching.instructors.delete-title')"
      :description="$t('pages.teaching.instructors.delete-confirm')"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
