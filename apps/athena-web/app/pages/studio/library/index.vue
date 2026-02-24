<script setup lang="ts">
import { BlockType, Permission } from '@athena/types'
import type { LibraryBlockResponse, FilterLibraryBlockRequest } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { can } = useAcl()
const { fetchLibraryBlocks, deleteLibraryBlock } = useStudio()

const search = ref('')

const selectedType = ref<string | null>(null)
const selectedTags = ref<string[]>([])

const filters = reactive<FilterLibraryBlockRequest>({
  page: 1,
  limit: 10,
  search: '',
  type: undefined,
  tags: undefined
})

watchDebounced(search, (val) => {
  filters.search = val || undefined
  filters.page = 1
}, { debounce: 500, maxWait: 1000 })

watch([selectedType, selectedTags], ([newType, newTags]) => {
  filters.type = (newType as BlockType) || undefined
  filters.tags = newTags.length > 0 ? newTags : undefined
  filters.page = 1
})

const { data, status, refresh } = await fetchLibraryBlocks(filters)

const loading = computed(() => status.value === 'pending')
const templates = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)

const columns = computed<TableColumn<LibraryBlockResponse>[]>(() => [
  { accessorKey: 'type', header: t('pages.library.columns.type'), class: 'w-[15%]' },
  { accessorKey: 'preview', header: t('pages.library.columns.preview'), class: 'w-[40%]' },
  { accessorKey: 'tags', header: t('pages.library.columns.tags') },
  { accessorKey: 'updatedAt', header: t('pages.library.columns.updated-at') },
  { id: 'actions', header: '' }
])

const blockTypeOptions = [
  { label: 'Text', value: BlockType.Text },
  { label: 'Code', value: BlockType.Code },
  { label: 'Quiz', value: BlockType.QuizQuestion }
]

const getPreviewText = (block: LibraryBlockResponse) => {
  if (block.type === BlockType.Text) return block.content.json?.text || '...'
  if (block.type === BlockType.QuizQuestion) return block.content.question?.json?.text || '...'
  if (block.type === BlockType.Code) return block.content.taskText?.json?.text || '...'
  return '...'
}

const isSlideoverOpen = ref(false)
const selectedTemplate = ref<LibraryBlockResponse | null>(null)

const openCreate = () => {
  selectedTemplate.value = null
  isSlideoverOpen.value = true
}

const openEdit = (template: LibraryBlockResponse) => {
  selectedTemplate.value = template
  isSlideoverOpen.value = true
}

const isDeleteOpen = ref(false)
const templateToDelete = ref<LibraryBlockResponse | null>(null)
const deleteLoading = ref(false)

const openDelete = (template: LibraryBlockResponse) => {
  templateToDelete.value = template
  isDeleteOpen.value = true
}

const onConfirmDelete = async () => {
  if (!templateToDelete.value) return
  deleteLoading.value = true
  try {
    await deleteLibraryBlock(templateToDelete.value.id)
    await refresh()
    isDeleteOpen.value = false
  } finally {
    deleteLoading.value = false
    templateToDelete.value = null
  }
}
</script>

<template>
  <div class="p-4 space-y-6">
    <div class="flex justify-between items-center gap-4">
      <div>
        <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {{ $t('pages.library.title') }}
        </h1>
        <p class="text-gray-500 text-sm mt-1">
          {{ $t('pages.library.subtitle') }}
        </p>
      </div>
      <UButton
        v-if="can(Permission.LESSONS_CREATE)"
        icon="i-lucide-plus"
        :label="$t('pages.library.create')"
        color="primary"
        variant="solid"
        @click="openCreate"
      />
    </div>

    <div class="flex flex-col sm:flex-row gap-4">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="$t('common.search')"
        class="w-full sm:flex-1"
      />

      <USelectMenu
        v-model="selectedType"
        :options="blockTypeOptions"
        value-attribute="value"
        option-attribute="label"
        :placeholder="$t('pages.library.filters.type')"
        icon="i-lucide-filter"
        class="w-full sm:w-48"
        clearable
      />

      <USelectMenu
        v-model="selectedTags"
        multiple
        creatable
        searchable
        :placeholder="$t('pages.library.filters.tags')"
        icon="i-lucide-tags"
        class="w-full sm:w-64"
      >
        <template #label>
          <span
            v-if="selectedTags.length"
            class="truncate"
          >{{ selectedTags.join(', ') }}</span>
          <span v-else>{{ $t('pages.library.filters.tags') }}</span>
        </template>
      </USelectMenu>
    </div>

    <UTable
      :data="templates"
      :columns="columns"
      :loading="loading"
    >
      <template #type-cell="{ row }">
        <UBadge
          variant="subtle"
          color="primary"
          class="font-mono text-xs uppercase"
        >
          {{ row.original.type.replace('_', ' ') }}
        </UBadge>
      </template>

      <template #preview-cell="{ row }">
        <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {{ getPreviewText(row.original) }}
        </p>
      </template>

      <template #tags-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="tag in row.original.tags"
            :key="tag"
            variant="outline"
            size="xs"
            color="neutral"
          >
            #{{ tag }}
          </UBadge>
          <span
            v-if="!row.original.tags?.length"
            class="text-gray-400 text-xs"
          >-</span>
        </div>
      </template>

      <template #updatedAt-cell="{ row }">
        <span class="text-sm text-gray-500 whitespace-nowrap">
          {{ new Date(row.original.updatedAt).toLocaleDateString() }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div
          v-if="can(Permission.LESSONS_UPDATE)"
          class="flex justify-end gap-2"
        >
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

    <div
      v-if="total > filters.limit"
      class="flex justify-end p-4 border-t border-gray-200 dark:border-gray-800"
    >
      <UPagination
        v-model="filters.page"
        :total="total"
        :page-count="filters.limit"
      />
    </div>

    <StudioLibrarySlideover
      v-model="isSlideoverOpen"
      :template="selectedTemplate"
      @success="refresh"
    />

    <ConfirmModal
      v-model:open="isDeleteOpen"
      danger
      :title="$t('pages.library.delete-title')"
      :description="$t('pages.library.delete-confirm')"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
