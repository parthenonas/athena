<script setup lang="ts">
import { BlockType } from '@athena/types'
import type { LessonResponse } from '@athena/types'

definePageMeta({
  layout: 'studio'
})

const route = useRoute()
const { t, locale, setLocale } = useI18n()

const { fetchAllLessons, deleteLesson, fetchBlocks, createBlock, deleteBlock } = useStudio()
const authStore = useAuthStore()

const courseId = route.params.id as string

const { data: lessons, refresh: refreshLessons } = await useAsyncData<LessonResponse[]>(
  `lessons-${courseId}`,
  () => fetchAllLessons(courseId),
  { default: () => [] }
)

const isInspectorOpen = ref(true)
const activeLessonId = ref<string | null>(null)

const isBlocksLoading = ref(false)
const activeBlockId = ref<string | null>(null)

watchEffect(() => {
  if (lessons.value && lessons.value.length > 0 && !activeLessonId.value) {
    activeLessonId.value = lessons.value[0]!.id
  }
})

const { data: blocks, refresh: refetchBlocks } = useAsyncData(`blocks-${activeLessonId.value}`, async () => {
  return await fetchBlocks(activeLessonId.value!)
}, { default: () => [], watch: [activeLessonId] })

const activeLesson = computed(() =>
  lessons.value.find(l => l.id === activeLessonId.value)
)

const isLessonModalOpen = ref(false)
const selectedLesson = ref<LessonResponse | null>(null)

const openAddLesson = () => {
  selectedLesson.value = null
  isLessonModalOpen.value = true
}

const openEditLesson = (lesson: LessonResponse) => {
  selectedLesson.value = lesson
  isLessonModalOpen.value = true
}

const onLessonSaved = async () => {
  await refreshLessons()
  if (lessons.value.length === 1 && !activeLessonId.value) {
    activeLessonId.value = lessons.value[0]!.id
  }
}

const isDeleteOpen = ref(false)
const lessonToDelete = ref<LessonResponse | null>(null)
const deleteLoading = ref(false)

const openDeleteLesson = (lesson: LessonResponse) => {
  lessonToDelete.value = lesson
  isDeleteOpen.value = true
}

const onConfirmDelete = async () => {
  if (!lessonToDelete.value) return

  deleteLoading.value = true
  try {
    await deleteLesson(lessonToDelete.value.id)

    if (activeLessonId.value === lessonToDelete.value.id) {
      activeLessonId.value = null
    }

    await refreshLessons()
    isDeleteOpen.value = false
  } finally {
    deleteLoading.value = false
    lessonToDelete.value = null
  }
}

const blockTypes = [
  { label: 'Text', icon: 'i-lucide-align-left', type: BlockType.Text },
  { label: 'Code', icon: 'i-lucide-code', type: BlockType.Code },
  { label: 'Video', icon: 'i-lucide-video', type: BlockType.Video },
  { label: 'Quiz', icon: 'i-lucide-check-square', type: BlockType.Quiz }
]

const onAddBlock = async (type: BlockType) => {
  if (!activeLessonId.value) return

  let content = {}
  if (type === BlockType.Text) content = { json: { type: 'doc', content: [] } }
  if (type === BlockType.Code) content = { language: 'javascript', initialCode: '// Write your code here' }

  const newBlock = await createBlock({
    lessonId: activeLessonId.value,
    type,
    content
  })

  await refetchBlocks()
  activeBlockId.value = newBlock.id
  isInspectorOpen.value = true
}

const onDeleteBlock = async (id: string) => {
  if (!confirm('Delete block?')) return

  try {
    await deleteBlock(id)
    await refetchBlocks()
    if (activeBlockId.value === id) activeBlockId.value = null
  } catch (e) {
    console.error(e)
  }
}

const toggleLang = () => {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}

const userMenuItems = computed(() => [
  [
    {
      label: authStore.user?.login || 'User',
      slot: 'account',
      disabled: true
    }
  ],
  [
    {
      label: t('pages.dashboard.menu.settings'),
      icon: 'i-lucide-settings',
      to: '/settings'
    }
  ],
  [
    {
      label: t('pages.dashboard.menu.logout'),
      icon: 'i-lucide-log-out',
      onSelect: () => authStore.logout()
    }
  ]
])

const getLessonActions = (lesson: LessonResponse) => [
  [
    {
      label: t('common.edit'),
      icon: 'i-lucide-pencil',
      onSelect: () => openEditLesson(lesson)
    },
    {
      label: t('common.delete'),
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => openDeleteLesson(lesson)
    }
  ]
]

const addBlockItems = computed(() => [
  blockTypes.map(t => ({
    label: t.label,
    icon: t.icon,
    onSelect: () => onAddBlock(t.type)
  }))
])
</script>

<template>
  <UDashboardGroup>
    <UDashboardPanel
      resizable
      :min-size="23"
      :default-size="23"
      :max-size="30"
    >
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UButton
              variant="ghost"
              @click="$router.back()"
            >
              <UIcon name="i-lucide-arrow-left" />
            </UButton>
          </template>

          <template #title>
            <div class="flex items-center gap-2">
              <span class="font-display font-bold text-2xl text-gray-900 dark:text-white">
                ATHENA
              </span>
              <UBadge
                label="LMS"
                variant="solid"
                color="primary"
                size="md"
                class="font-display font-bold rounded-none"
              />
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="flex-1 overflow-y-auto flex flex-col p-0">
          <div class="px-2 mb-2">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {{ $t('pages.studio.builder.structure') }}
            </span>
          </div>

          <div class="space-y-1">
            <div
              v-for="(lesson, index) in lessons"
              :key="lesson.id"
              class="group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-sm font-medium"
              :class="[
                activeLessonId === lesson.id
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              ]"
              @click="activeLessonId = lesson.id"
            >
              <div class="flex items-center gap-2 min-w-0">
                <UIcon
                  :name="lesson.isDraft ? 'i-lucide-file-dashed' : 'i-lucide-file-check'"
                  class="w-4 h-4 shrink-0"
                />
                <span class="truncate">{{ index + 1 }}. {{ lesson.title }}</span>
              </div>

              <UDropdownMenu
                :items="getLessonActions(lesson)"
                :popper="{ placement: 'bottom-end' }"
              >
                <UButton
                  icon="i-lucide-more-vertical"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  @click.stop
                />
              </UDropdownMenu>
            </div>
          </div>

          <div class="mt-4 px-1">
            <UButton
              icon="i-lucide-plus"
              :label="$t('pages.studio.builder.add-lesson')"
              variant="soft"
              block
              color="neutral"
              size="sm"
              @click="openAddLesson"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-col w-full gap-2 border-t border-gray-200 dark:border-gray-800 px-4 py-2 sm:px-6">
          <UDropdownMenu
            v-if="authStore.user"
            :items="userMenuItems"
            :popper="{ placement: 'right-start' }"
            class="w-full"
          >
            <UButton
              :avatar="{ alt: authStore.user.login, size: '2xs' }"
              :label="authStore.user.login"
              color="neutral"
              variant="ghost"
              class="w-full justify-start"
            />
          </UDropdownMenu>

          <div class="flex items-center justify-start gap-1 px-2 pb-1">
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              :label="locale === 'ru' ? 'RU' : 'EN'"
              icon="i-lucide-languages"
              class="font-display font-bold"
              @click="toggleLang"
            />
            <UColorModeButton size="xs" />
          </div>
        </div>
      </template>
    </UDashboardPanel>

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
          class="max-w-3xl mx-auto w-full pb-20 relative min-h-full flex flex-col"
        >
          <div
            v-if="isBlocksLoading"
            class="flex justify-center py-10"
          >
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin w-8 h-8 text-primary-500"
            />
          </div>

          <div
            v-else-if="blocks.length === 0"
            class="flex-1 flex flex-col items-center justify-center p-8 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
          >
            <UIcon
              name="i-lucide-blocks"
              class="w-12 h-12 mb-2"
            />
            <p>{{ $t('pages.studio.builder.no-blocks') }}</p>
          </div>

          <div
            v-else
            class="space-y-4"
          >
            <div
              v-for="(block) in blocks"
              :key="block.id"
              class="group relative bg-white dark:bg-gray-900 rounded-lg border shadow-sm transition-all"
              :class="[
                activeBlockId === block.id
                  ? 'border-primary-500 ring-1 ring-primary-500 z-10'
                  : 'border-gray-200 dark:border-gray-800 hover:border-primary-300'
              ]"
              @click="activeBlockId = block.id"
            >
              <div class="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-lg">
                <div class="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase">
                  <UIcon
                    :name="blockTypes.find(t => t.type === block.type)?.icon || 'i-lucide-box'"
                    class="w-4 h-4"
                  />
                  {{ block.type }}
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <UButton
                    icon="i-lucide-grip-vertical"
                    variant="ghost"
                    color="neutral"
                    class="cursor-grab"
                  />
                  <UButton
                    icon="i-lucide-trash"
                    variant="ghost"
                    color="error"
                    @click.stop="onDeleteBlock(block.id)"
                  />
                </div>
              </div>

              <div class="p-4 min-h-15 cursor-pointer">
                <div class="text-sm text-gray-400 italic">
                  {{ block.type }} content preview...
                </div>
              </div>
            </div>
          </div>

          <div class="sticky bottom-4 mt-8 flex justify-center z-20">
            <UDropdownMenu
              :items="addBlockItems"
              :popper="{ placement: 'top' }"
            >
              <UButton
                icon="i-lucide-plus"
                :label="$t('pages.studio.builder.add-block')"
                color="primary"
                variant="solid"
                size="lg"
                class="shadow-lg rounded-full px-6"
              />
            </UDropdownMenu>
          </div>
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
        <UDashboardNavbar :title="activeBlockId ? $t('pages.studio.builder.block-settings') : $t('pages.studio.builder.properties')" />
      </template>

      <template #body>
        <div
          v-if="activeBlockId"
          class="space-y-4"
        >
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded-md text-sm border border-yellow-200 dark:border-yellow-800">
            <div class="font-bold mb-1">
              Editing Block
            </div>
            <div class="font-mono text-xs">
              {{ blocks.find(b => b.id === activeBlockId)?.type }}
            </div>
            <div class="font-mono text-xs opacity-75">
              {{ activeBlockId }}
            </div>
          </div>
        </div>

        <div
          v-else-if="activeLesson"
          class="space-y-4"
        >
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div class="text-xs text-gray-500 uppercase font-bold mb-1">
              {{ $t('components.studio.lesson-modal.title-label') }}
            </div>
            <div class="text-sm font-medium">
              {{ activeLesson.title }}
            </div>
          </div>
          <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div class="text-xs text-gray-500 uppercase font-bold mb-1">
              {{ $t('components.studio.lesson-modal.goals-label') }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-300 italic">
              {{ activeLesson.goals || 'No goals set' }}
            </div>
          </div>
        </div>

        <div
          v-else
          class="text-sm text-gray-500 text-center mt-10"
        >
          {{ $t('pages.studio.builder.select-element') }}
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
      v-model:open="isDeleteOpen"
      danger
      :title="$t('pages.studio.builder.delete-lesson-title')"
      :description="$t('pages.studio.builder.delete-lesson-confirm')"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />
  </UDashboardGroup>
</template>
