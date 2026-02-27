<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { BlockType, Permission } from '@athena/types'
import type { LibraryBlockResponse, FilterLibraryBlockRequest, TextBlockContent, QuizQuestionContent, CodeBlockContent } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const router = useRouter()
const { t } = useI18n()
const { can } = useAcl()
const toast = useToast()
const { fetchLibraryBlocks, deleteLibraryBlock, createLibraryBlock } = useStudio()

const schema = z.object({
  search: z.string().optional(),
  type: z.nativeEnum(BlockType).optional(),
  tags: z.array(z.string()).default([])
})

type Schema = z.output<typeof schema>

const searchState = reactive<Schema>({
  search: '',
  type: undefined,
  tags: []
})

const filters = reactive<FilterLibraryBlockRequest>({
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
  search: undefined,
  type: undefined,
  tags: undefined
})

const onSubmit = (event: FormSubmitEvent<Schema>) => {
  filters.search = event.data.search || undefined
  filters.type = event.data.type || undefined
  filters.tags = event.data.tags.length ? event.data.tags : undefined
  filters.page = 1
}

const onReset = () => {
  searchState.search = ''
  searchState.type = undefined
  searchState.tags = []

  filters.search = undefined
  filters.type = undefined
  filters.tags = undefined
  filters.page = 1
}

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

const blockTypes = computed(() => [
  { label: t('blocks.type.text'), id: BlockType.Text },
  { label: t('blocks.type.code'), id: BlockType.Code }
])

const getPreviewText = (block: LibraryBlockResponse) => {
  if (block.type === BlockType.Text) return (block.content as TextBlockContent).json?.text || '...'
  if (block.type === BlockType.QuizQuestion) return (block.content as QuizQuestionContent).question?.json?.text || '...'
  if (block.type === BlockType.Code) return (block.content as CodeBlockContent).taskText?.json?.text || '...'
  return '...'
}

const openCreate = () => {
  router.push('/studio/library/create')
}

const openEdit = (template: LibraryBlockResponse) => {
  router.push(`/studio/library/${template.id}`)
}

const copyLoading = ref<string | null>(null)

const openCopy = async (template: LibraryBlockResponse) => {
  copyLoading.value = template.id
  try {
    const newTemplate = await createLibraryBlock({
      type: template.type,
      tags: [...(template.tags || [])],
      content: template.content
    })

    toast.add({
      title: t('common.success'),
      description: t('toasts.library.created'),
      color: 'success'
    })

    router.push(`/studio/library/${newTemplate.id}`)
  } catch (e) {
    console.error('Failed to copy template', e)
  } finally {
    copyLoading.value = null
  }
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

    <UForm
      :schema="schema"
      :state="searchState"
      class="flex flex-col md:flex-row items-start gap-4"
      @submit="onSubmit"
    >
      <UFormField
        name="search"
        class="w-full md:flex-1"
      >
        <UInput
          v-model="searchState.search"
          icon="i-lucide-search"
          :placeholder="$t('common.search')"
          class="w-full"
        />
      </UFormField>

      <UFormField
        name="type"
        class="w-full md:w-48"
      >
        <USelectMenu
          v-model="searchState.type"
          :items="blockTypes"
          value-key="id"
          :placeholder="$t('pages.library.filters.type')"
          icon="i-lucide-filter"
          class="w-full"
          size="lg"
          clearable
        />
      </UFormField>

      <UFormField
        name="tags"
        class="w-full md:w-64"
      >
        <UInputTags
          v-model="searchState.tags"
          :placeholder="$t('pages.library.filters.tags')"
          class="w-full"
        />
      </UFormField>

      <div class="flex gap-2">
        <UButton
          type="submit"
          icon="i-lucide-search"
          color="primary"
          variant="solid"
          size="lg"
          :loading="loading"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="soft"
          size="lg"
          @click="onReset"
        />
      </div>
    </UForm>

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
          <UTooltip :text="$t('common.copy')">
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="xs"
              :loading="copyLoading === row.original.id"
              @click="openCopy(row.original)"
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

    <div class="flex justify-end p-4 border-t border-gray-200 dark:border-gray-800">
      <UPagination
        v-model="filters.page"
        :total="total"
        :page-count="filters.limit"
      />
    </div>

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
