<script setup lang="ts">
import { BlockType, CodeExecutionMode } from '@athena/types'
import type { LibraryBlockResponse, BlockContent, TextBlockContent, CodeBlockContent, BlockDryRunRequest, SubmissionResult } from '@athena/types'
import { useDebounceFn } from '@vueuse/core'

import StudioInspectorCode from '~/components/studio/inspector/Code.vue'
import StudioInspectorText from '~/components/studio/inspector/Text.vue'

definePageMeta({
  layout: false
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const { fetchLibraryBlock, createLibraryBlock, updateLibraryBlock, runBlockCode } = useStudio()

const isCreateMode = route.params.id === 'create'
const isLoading = ref(!isCreateMode)
const isSaving = ref(false)

const templateState = ref<Partial<LibraryBlockResponse>>({
  type: undefined,
  tags: [],
  content: {} as BlockContent
})

const socketStore = useSocketStore()
const { socketId } = storeToRefs(socketStore)
const { parseSubmission } = useSubmissionParser()

const executionStates = ref<Record<string, { isRunning: boolean, output: string }>>({})
const DUMMY_UUID = '00000000-0000-0000-0000-000000000000'

onMounted(async () => {
  socketStore.connect()

  socketStore.on('execution_result', (data) => {
    const rawResult = data as SubmissionResult
    const completedBlockId = rawResult.metadata?.blockId

    if (completedBlockId && executionStates.value[completedBlockId]) {
      const { formattedOutput, statusLabel, isError, stats } = parseSubmission(rawResult)
      let finalDisplay = ''
      if (stats && !isError) finalDisplay += `[${statusLabel} | ${stats}]\n\n`
      else if (isError) finalDisplay += `[${statusLabel}]\n\n`

      finalDisplay += formattedOutput

      executionStates.value[completedBlockId] = {
        isRunning: false,
        output: finalDisplay
      }
    }
  })

  if (!isCreateMode) {
    try {
      const data = await fetchLibraryBlock(route.params.id as string)
      templateState.value = {
        id: data.id,
        type: data.type,
        tags: [...data.tags],
        content: JSON.parse(JSON.stringify(data.content))
      }
    } catch (e) {
      console.error(e)
      router.push('/studio/library')
    } finally {
      isLoading.value = false
    }
  }
})

onUnmounted(() => {
  socketStore.off('execution_result')
})

const blockTypes = computed(() => [
  { label: t('blocks.type.text'), icon: 'i-lucide-align-left', type: BlockType.Text },
  { label: t('blocks.type.code'), icon: 'i-lucide-code', type: BlockType.Code }
])

const serverUpdate = useDebounceFn(async () => {
  if (!templateState.value.id || !templateState.value.type) return
  try {
    await updateLibraryBlock(templateState.value.id, {
      type: templateState.value.type,
      tags: templateState.value.tags,
      content: templateState.value.content
    }, true)
  } catch (e) {
    console.error('Autosave failed', e)
  }
}, 500)

const selectType = async (type: BlockType) => {
  isLoading.value = true
  try {
    let content: BlockContent
    if (type === BlockType.Text) {
      content = { json: { type: 'doc', content: [{ type: 'paragraph' }] } } as TextBlockContent
    } else if (type === BlockType.Code) {
      content = {
        language: 'python',
        initialCode: '',
        taskText: { json: { type: 'doc', content: [{ type: 'paragraph' }] } } as TextBlockContent,
        executionMode: CodeExecutionMode.IoCheck
      } as CodeBlockContent
    } else {
      content = {} as BlockContent
    }

    const newTemplate = await createLibraryBlock({
      type,
      tags: [],
      content
    })

    templateState.value = {
      id: newTemplate.id,
      type: newTemplate.type,
      tags: [...newTemplate.tags],
      content: JSON.parse(JSON.stringify(newTemplate.content))
    }

    toast.add({
      title: t('common.success'),
      description: t('toasts.library.created'),
      color: 'success'
    })

    router.replace(`/studio/library/${newTemplate.id}`)
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const settingsComponent = computed(() => {
  switch (templateState.value.type) {
    case BlockType.Code: return StudioInspectorCode
    case BlockType.Text: return StudioInspectorText
    default: return null
  }
})

const updateContent = (keyOrPayload: string | Partial<BlockContent>, value?: unknown) => {
  let mergedContent = { ...templateState.value.content }

  if (typeof keyOrPayload === 'string') {
    mergedContent = { ...mergedContent, [keyOrPayload]: value }
  } else {
    mergedContent = { ...mergedContent, ...keyOrPayload }
  }

  templateState.value.content = mergedContent as BlockContent
  serverUpdate()
}

const onSave = () => {
  serverUpdate()
  toast.add({
    title: t('common.success'),
    description: t('toasts.library.updated'),
    color: 'success'
  })
}

const onRunCode = async (code: string) => {
  if (!socketId.value) return

  const runId = templateState.value.id || DUMMY_UUID

  executionStates.value[runId] = { isRunning: true, output: '' }

  const contentPayload = {
    ...(templateState.value.content as CodeBlockContent),
    initialCode: code
  }

  try {
    const payload: BlockDryRunRequest = {
      blockId: runId,
      socketId: socketId.value,
      content: contentPayload
    }

    await runBlockCode(payload)
  } catch (e) {
    console.error('Failed to start execution', e)
    executionStates.value[runId] = {
      isRunning: false,
      output: 'System Error: Failed to send request to server.'
    }
  }
}
</script>

<template>
  <NuxtLayout name="dashboard">
    <template #default>
      <div class="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
        <UDashboardNavbar>
          <template #leading>
            <UButton
              variant="ghost"
              icon="i-lucide-arrow-left"
              @click="$router.push('/studio/library')"
            />
            <h1 class="font-semibold text-gray-900 dark:text-white truncate">
              {{ isCreateMode ? $t('pages.library.editor.title-create') : $t('pages.library.editor.title-edit') }}
            </h1>
          </template>

          <template #right>
            <UButton
              :label="$t('common.save')"
              icon="i-lucide-save"
              color="primary"
              :loading="isSaving"
              :disabled="!templateState.type"
              @click="onSave"
            />
          </template>
        </UDashboardNavbar>

        <div
          v-if="isLoading"
          class="flex justify-center items-center h-full"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin text-primary-500"
          />
        </div>

        <div
          v-else
          class="flex-1 overflow-y-auto py-6 px-4"
        >
          <div class="max-w-3xl mx-auto flex flex-col h-full">
            <div
              v-if="isCreateMode && !templateState.type"
              class="flex flex-col items-center justify-center h-full gap-6"
            >
              <div class="text-center">
                <UIcon
                  name="i-lucide-blocks"
                  class="w-12 h-12 text-gray-400 mx-auto mb-4"
                />
                <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                  {{ $t('pages.library.editor.select-type') }}
                </h2>
                <p class="text-sm text-gray-500 mt-1">
                  {{ $t('pages.library.editor.select-type-desc') }}
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                <UButton
                  v-for="bType in blockTypes"
                  :key="bType.type"
                  color="neutral"
                  variant="outline"
                  size="xl"
                  class="flex flex-col items-center justify-center h-24 hover:border-primary-500 hover:text-primary-500 transition-colors"
                  @click="selectType(bType.type)"
                >
                  <UIcon
                    :name="bType.icon"
                    class="w-6 h-6 mb-2"
                  />
                  <span>{{ bType.label }}</span>
                </UButton>
              </div>
            </div>

            <div
              v-else-if="templateState.type"
              class="bg-white dark:bg-gray-900 rounded-lg ring-1 ring-gray-200 dark:ring-gray-800 p-4 shadow-sm relative"
            >
              <div class="absolute -top-3 -left-2 z-10">
                <UBadge
                  variant="solid"
                  color="primary"
                  class="font-mono text-[10px] uppercase shadow-sm"
                >
                  {{ templateState.type.replace('_', ' ') }}
                </UBadge>
              </div>

              <StudioBlocksText
                v-if="templateState.type === BlockType.Text"
                :model-value="(templateState.content as TextBlockContent)"
                @update:model-value="(val) => { templateState.content = val; serverUpdate() }"
              />

              <StudioBlocksCode
                v-else-if="templateState.type === BlockType.Code"
                :model-value="(templateState.content as CodeBlockContent)"
                :is-running="executionStates[templateState.id || DUMMY_UUID]?.isRunning"
                :output="executionStates[templateState.id || DUMMY_UUID]?.output"
                @update:model-value="(val) => { templateState.content = val; serverUpdate() }"
                @run="onRunCode"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #right>
      <div
        v-if="templateState.type && !isLoading"
        class="flex flex-col h-full"
      >
        <UDashboardNavbar :title="$t('pages.library.editor.settings')" />

        <div class="flex flex-col h-full px-4 overflow-y-auto py-4 space-y-6">
          <section class="flex flex-col gap-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {{ $t('pages.library.editor.tags') }}
            </span>
            <UFormField>
              <UInputTags
                v-model="templateState.tags"
                :placeholder="$t('pages.library.filters.tags')"
                class="w-full"
                @update:model-value="serverUpdate"
              />
            </UFormField>
          </section>

          <USeparator />

          <component
            :is="settingsComponent"
            v-if="settingsComponent"
            :content="templateState.content"
            @update="updateContent"
          />
        </div>
      </div>
    </template>
  </NuxtLayout>
</template>
