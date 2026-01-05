<script setup lang="ts">
import { BlockType, CodeExecutionMode } from '@athena/types'
import type { LessonResponse, UpdateLessonRequest, UpdateBlockRequest, BlockResponse, TextBlockContent, CodeBlockContent, BlockContent } from '@athena/types'
import type { SortableEvent } from 'vue-draggable-plus'
import { useDebounceFn } from '@vueuse/core'

definePageMeta({
  layout: 'studio'
})

const route = useRoute()
const {
  fetchAllLessons,
  deleteLesson,
  fetchBlocks,
  createBlock,
  deleteBlock,
  reorderBlock,
  updateBlock,
  updateLesson
} = useStudio()

const courseId = route.params.id as string

const { data: lessons, refresh: refreshLessons } = await useAsyncData<LessonResponse[]>(
  `lessons-${courseId}`,
  () => fetchAllLessons(courseId),
  { default: () => [] }
)

const activeLessonId = ref<string | null>(null)

watch(activeLessonId, () => {
  activeBlockId.value = null
})

watchEffect(() => {
  if (lessons.value && lessons.value.length > 0 && !activeLessonId.value) {
    activeLessonId.value = lessons.value[0]!.id
  }
})

const activeLesson = computed(() =>
  lessons.value.find(l => l.id === activeLessonId.value)
)

const isBlocksLoading = ref(false)
const activeBlockId = ref<string | null>(null)

const { data: blocks, refresh: refetchBlocks } = useAsyncData(`blocks-${activeLessonId.value}`, async () => {
  if (!activeLessonId.value) return []
  return await fetchBlocks(activeLessonId.value)
}, { default: () => [], watch: [activeLessonId] })

const activeBlock = computed(() =>
  blocks.value.find(b => b.id === activeBlockId.value)

)

const isInspectorOpen = ref(true)

const isLessonModalOpen = ref(false)
const selectedLesson = ref<LessonResponse | null>(null)

const isDeleteLessonOpen = ref(false)
const lessonToDelete = ref<LessonResponse | null>(null)
const deleteLessonLoading = ref(false)

const isDeleteBlockOpen = ref(false)
const blockToDelete = ref<string | null>(null)
const deleteBlockLoading = ref(false)

const openAddLesson = () => {
  selectedLesson.value = null
  isLessonModalOpen.value = true
}

const openDeleteLesson = (lesson: LessonResponse) => {
  lessonToDelete.value = lesson
  isDeleteLessonOpen.value = true
}

const onLessonSaved = async () => {
  await refreshLessons()
  if (lessons.value.length === 1 && !activeLessonId.value) {
    activeLessonId.value = lessons.value[0]!.id
  }
}

const onUpdateLesson = useDebounceFn(async (id: string, payload: UpdateLessonRequest) => {
  const lesson = lessons.value.find(l => l.id === id)
  if (lesson) Object.assign(lesson, payload)

  try {
    await updateLesson(id, payload)
    await refreshLessons()
  } catch (e) {
    console.error(e)
  }
}, 500)

const onConfirmDeleteLesson = async () => {
  if (!lessonToDelete.value) return
  deleteLessonLoading.value = true
  try {
    await deleteLesson(lessonToDelete.value.id)
    if (activeLessonId.value === lessonToDelete.value.id) {
      activeLessonId.value = null
    }
    await refreshLessons()
    isDeleteLessonOpen.value = false
  } finally {
    deleteLessonLoading.value = false
    lessonToDelete.value = null
  }
}

const onReorderLessons = async (event: SortableEvent) => {
  const { newIndex, oldIndex } = event
  if (newIndex === oldIndex) return

  // TODO: Backend sync implementation pending
  console.log('Reorder lessons:', { newIndex, oldIndex })
}

const onAddBlock = async (type: BlockType) => {
  if (!activeLessonId.value) return

  let content = {} as BlockContent
  if (type === BlockType.Text) {
    content = { json: { type: 'doc', content: [{ type: 'paragraph' }] } } as TextBlockContent
  }
  if (type === BlockType.Code) {
    content = {
      language: 'python',
      initialCode: '',
      taskText: { json: { type: 'doc', content: [{ type: 'paragraph' }] } } as TextBlockContent,
      executionMode: CodeExecutionMode.IoCheck } as CodeBlockContent
  }

  const newBlock = await createBlock({
    lessonId: activeLessonId.value,
    type,
    content
  })

  await refetchBlocks()
  activeBlockId.value = newBlock.id
  isInspectorOpen.value = true
}

const openDeleteBlock = (id: string) => {
  blockToDelete.value = id
  isDeleteBlockOpen.value = true
}

const onConfirmDeleteBlock = async () => {
  if (!blockToDelete.value) return
  deleteBlockLoading.value = true
  try {
    await deleteBlock(blockToDelete.value)
    if (blocks.value) {
      blocks.value = blocks.value.filter(b => b.id !== blockToDelete.value)
    }
    if (activeBlockId.value === blockToDelete.value) activeBlockId.value = null
    isDeleteBlockOpen.value = false
  } catch (e) {
    console.error(e)
  } finally {
    deleteBlockLoading.value = false
    blockToDelete.value = null
  }
}

const onUpdateBlock = (id: string, payload: UpdateBlockRequest) => {
  blocks.value = blocks.value.map(b =>
    b.id === id ? { ...b, ...payload } as BlockResponse : b
  )
  serverUpdateBlock(id, payload)
}

const serverUpdateBlock = useDebounceFn(async (id: string, payload: UpdateBlockRequest) => {
  try {
    await updateBlock(id, payload)
  } catch (e) {
    console.error('Block save failed', e)
  }
}, 500)

const onReorderBlocks = async (event: SortableEvent) => {
  const { newIndex, oldIndex } = event
  if (newIndex === oldIndex || newIndex === undefined) return

  const movedBlock = blocks.value[newIndex]
  const prevBlock = blocks.value[newIndex - 1]
  const nextBlock = blocks.value[newIndex + 1]

  let newOrder = 0
  if (!prevBlock) newOrder = (nextBlock?.orderIndex || 0) / 2
  else if (!nextBlock) newOrder = (prevBlock?.orderIndex || 0) + 1024
  else newOrder = (prevBlock.orderIndex + nextBlock.orderIndex) / 2

  try {
    movedBlock!.orderIndex = newOrder
    await reorderBlock(movedBlock!.id, newOrder)
  } catch (e) {
    console.error(e)
    await refetchBlocks()
  }
}
</script>

<template>
  <UDashboardGroup>
    <StudioStructureSidebar
      v-model:active-lesson-id="activeLessonId"
      :lessons="lessons"
      @add="openAddLesson"
      @update:lessons="(val) => lessons = val"
      @reorder="onReorderLessons"
    />

    <UDashboardPanel resizable>
      <template #header>
        <UDashboardNavbar
          v-if="activeLesson"
          :title="activeLesson.title"
        >
          <template #right>
            <div class="flex items-center gap-2">
              <UButton
                :label="$t('pages.studio.builder.preview')"
                icon="i-lucide-eye"
                variant="outline"
                color="neutral"
                size="sm"
              />
              <UButton
                :label="$t('common.save')"
                icon="i-lucide-save"
                color="primary"
                size="sm"
              />
              <USeparator
                orientation="vertical"
                class="h-4"
              />
              <UTooltip :text="isInspectorOpen ? $t('pages.studio.builder.hide-inspector') : $t('pages.studio.builder.show-inspector')">
                <UButton
                  :icon="isInspectorOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
                  variant="ghost"
                  color="neutral"
                  @click="isInspectorOpen = !isInspectorOpen"
                />
              </UTooltip>
            </div>
          </template>
        </UDashboardNavbar>
        <UDashboardNavbar
          v-else
          :title="$t('pages.studio.builder.no-lesson-selected')"
        />
      </template>

      <template #body>
        <div
          v-if="activeLesson"
          class="h-full flex flex-col"
        >
          <StudioCanvas
            v-model:blocks="blocks"
            v-model:active-block-id="activeBlockId"
            :loading="isBlocksLoading"
            @add="onAddBlock"
            @update="onUpdateBlock"
            @delete="openDeleteBlock"
            @reorder="onReorderBlocks"
          />
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center h-full text-gray-500"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="w-8 h-8 mb-2 animate-pulse"
          />
          <p>{{ $t('pages.studio.builder.select-lesson-hint') }}</p>
        </div>
      </template>
    </UDashboardPanel>

    <UDashboardPanel
      v-if="isInspectorOpen"
      resizable
      :min-size="20"
      :default-size="25"
      :max-size="40"
    >
      <template #header>
        <UDashboardNavbar
          :title="activeBlockId
            ? $t('pages.studio.builder.block-settings')
            : $t('pages.studio.builder.inspector.lesson-properties')"
        />
      </template>

      <template #body>
        <StudioBlockInspector
          v-if="activeBlock"
          :block="activeBlock"
          @update="onUpdateBlock"
          @delete="openDeleteBlock"
        />

        <StudioLessonInspector
          v-else-if="activeLesson"
          :lesson="activeLesson"
          @update="onUpdateLesson"
          @delete="openDeleteLesson"
        />

        <div
          v-else
          class="flex flex-col items-center justify-center h-full text-gray-400"
        >
          <UIcon
            name="i-lucide-mouse-pointer-2"
            class="w-8 h-8 mb-2 opacity-50"
          />
          <p class="text-sm">
            {{ $t('pages.studio.builder.select-element') }}
          </p>
        </div>
      </template>
    </UDashboardPanel>

    <StudioLessonModal
      v-model="isLessonModalOpen"
      :course-id="courseId"
      :lesson="selectedLesson"
      @success="onLessonSaved"
    />

    <ConfirmModal
      v-model:open="isDeleteLessonOpen"
      danger
      :title="$t('pages.studio.builder.delete-lesson-title')"
      :description="$t('pages.studio.builder.delete-lesson-confirm')"
      :loading="deleteLessonLoading"
      @confirm="onConfirmDeleteLesson"
    />

    <ConfirmModal
      v-model:open="isDeleteBlockOpen"
      danger
      :title="$t('pages.studio.builder.delete-block-title')"
      :description="$t('pages.studio.builder.delete-block-confirm')"
      :loading="deleteBlockLoading"
      @confirm="onConfirmDeleteBlock"
    />
  </UDashboardGroup>
</template>
