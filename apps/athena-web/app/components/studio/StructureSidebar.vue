<script setup lang="ts">
import { VueDraggable, type SortableEvent } from 'vue-draggable-plus'
import type { LessonResponse } from '@athena/types'

const props = defineProps<{
  lessons: LessonResponse[]
  activeLessonId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:lessons', value: LessonResponse[]): void
  (e: 'update:activeLessonId', id: string): void
  (e: 'add'): void
  (e: 'reorder', event: SortableEvent): void
}>()

const { t, locale, setLocale } = useI18n()
const authStore = useAuthStore()

const localLessons = computed({
  get: () => props.lessons,
  set: val => emit('update:lessons', val)
})

const toggleLang = () => {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}

const userMenuItems = computed(() => [
  [
    { label: authStore.user?.login || 'User', slot: 'account', disabled: true }
  ],
  [
    { label: t('pages.dashboard.menu.settings'), icon: 'i-lucide-settings', to: '/settings' }
  ],
  [
    { label: t('pages.dashboard.menu.logout'), icon: 'i-lucide-log-out', onSelect: () => authStore.logout() }
  ]
])
</script>

<template>
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
            <span class="font-display font-bold text-2xl text-gray-900 dark:text-white">ATHENA</span>
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

        <VueDraggable
          v-model="localLessons"
          :animation="150"
          handle=".lesson-drag-handle"
          class="space-y-1"
          @end="(e) => emit('reorder', e)"
        >
          <div
            v-for="(lesson, index) in lessons"
            :key="lesson.id"
            class="group flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-colors text-sm font-medium relative"
            :class="[
              activeLessonId === lesson.id
                ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            ]"
            @click="emit('update:activeLessonId', lesson.id)"
          >
            <div
              class="lesson-drag-handle absolute left-0.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
              @click.stop
            >
              <UIcon
                name="i-lucide-grip-vertical"
                class="w-4 h-4"
              />
            </div>

            <div class="flex items-center gap-2 min-w-0 ml-4 transition-all">
              <UIcon
                :name="lesson.isDraft ? 'i-lucide-file-dashed' : 'i-lucide-file-check'"
                class="w-4 h-4 shrink-0"
                :class="activeLessonId === lesson.id ? 'text-primary-500' : 'text-gray-400'"
              />
              <span class="truncate">{{ index + 1 }}. {{ lesson.title }}</span>
            </div>

            <UIcon
              v-if="activeLessonId === lesson.id"
              name="i-lucide-chevron-right"
              class="w-4 h-4 text-primary-500"
            />
          </div>
        </VueDraggable>

        <div class="mt-4 px-1">
          <UButton
            icon="i-lucide-plus"
            :label="$t('pages.studio.builder.add-lesson')"
            variant="soft"
            block
            color="neutral"
            size="sm"
            @click="emit('add')"
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
</template>
