<script setup lang="ts">
import { BlockType } from '@athena/types'
import type { LibraryBlockResponse, FilterLibraryBlockRequest, TextBlockContent, QuizQuestionContent, CodeBlockContent } from '@athena/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'insert'])

const { fetchLibraryBlocks } = useStudio()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const search = ref('')
const selectedTags = ref<string[]>([])

const filters = reactive<FilterLibraryBlockRequest>({
  page: 1,
  limit: 20,
  search: undefined,
  tags: undefined,
  sortBy: 'createdAt',
  sortOrder: 'DESC'
})

watchDebounced(search, (val) => {
  filters.search = val || undefined
  filters.page = 1
}, { debounce: 500, maxWait: 1000 })

watch(selectedTags, (newTags) => {
  filters.tags = newTags.length > 0 ? newTags : undefined
  filters.page = 1
})

const { data, status } = await fetchLibraryBlocks(filters)

const loading = computed(() => status.value === 'pending')
const templates = computed(() => data.value?.data || [])

// Хелпер для превью
const getPreviewText = (block: LibraryBlockResponse) => {
  if (block.type === BlockType.Text) return (block.content as TextBlockContent).json?.text || '...'
  if (block.type === BlockType.QuizQuestion) return (block.content as QuizQuestionContent).question?.json?.text || '...'
  if (block.type === BlockType.Code) return (block.content as CodeBlockContent).taskText?.json?.text || '...'
  return '...'
}

const onInsert = (template: LibraryBlockResponse) => {
  // Прокидываем наружу тип и контент шаблона
  emit('insert', template.type, template.content)
  isOpen.value = false
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="$t('components.studio.library-insert.title')"
    :description="$t('components.studio.library-insert.description')"
  >
    <template #body>
      <div class="flex flex-col h-full gap-4">
        <div class="flex flex-col gap-3 shrink-0">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            :placeholder="$t('common.search')"
            class="w-full"
          />
          <UInputTags
            v-model="selectedTags"
            :placeholder="$t('pages.library.filters.tags')"
            class="w-full"
          />
        </div>

        <USeparator />

        <div class="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2">
          <div
            v-if="loading"
            class="flex justify-center py-10"
          >
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin w-6 h-6 text-primary-500"
            />
          </div>

          <div
            v-else-if="templates.length === 0"
            class="text-center py-10 text-gray-500 text-sm"
          >
            {{ $t('components.studio.library-insert.empty') }}
          </div>

          <div
            v-for="template in templates"
            v-else
            :key="template.id"
            class="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:border-primary-500 dark:hover:border-primary-500 transition-colors group"
          >
            <div class="flex justify-between items-start gap-2">
              <UBadge
                variant="subtle"
                color="primary"
                size="xs"
                class="font-mono uppercase"
              >
                {{ template.type.replace('_', ' ') }}
              </UBadge>

              <UButton
                size="xs"
                color="primary"
                variant="solid"
                icon="i-lucide-plus"
                :label="$t('common.insert')"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
                @click="onInsert(template)"
              />
            </div>

            <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
              {{ getPreviewText(template) }}
            </p>

            <div
              v-if="template.tags?.length"
              class="flex flex-wrap gap-1 mt-1"
            >
              <span
                v-for="tag in template.tags"
                :key="tag"
                class="text-[10px] font-medium text-gray-500 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded"
              >
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
