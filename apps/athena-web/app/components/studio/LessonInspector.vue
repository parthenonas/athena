<script setup lang="ts">
import type { LessonResponse, UpdateLessonRequest } from '@athena/types'

const props = defineProps<{
  lesson: LessonResponse
}>()

const emit = defineEmits<{
  (e: 'update', id: string, payload: UpdateLessonRequest): void
  (e: 'delete', lesson: LessonResponse): void
}>()

const updateField = (key: keyof LessonResponse, value: unknown) => {
  emit('update', props.lesson.id, { [key]: value })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-3 py-4 border-b border-gray-200 dark:border-gray-800">
      <div class="p-2 bg-gray-100 max-h-9 dark:bg-gray-800 rounded-md">
        <UIcon
          name="i-lucide-book-open"
          class="w-5 h-5 text-primary-500"
        />
      </div>
      <div>
        <div class="text-xs text-gray-500 font-bold uppercase tracking-wider">
          {{ $t('pages.studio.builder.inspector.type') }}
        </div>
        <div class="text-sm font-medium">
          {{ $t('pages.studio.builder.inspector.lesson') }}
        </div>
      </div>
    </div>

    <div class="overflow-y-auto py-4 space-y-6">
      <section class="flex flex-col gap-3">
        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {{ $t('pages.studio.builder.inspector.general') }}
        </span>

        <UFormField :label="$t('components.studio.lesson-modal.title-label')">
          <UInput
            :model-value="lesson.title"
            variant="outline"
            class="w-full"
            @update:model-value="val => updateField('title', val)"
          />
        </UFormField>

        <UFormField :label="$t('components.studio.lesson-modal.goals-label')">
          <UTextarea
            :model-value="lesson.goals"
            autoresize
            :rows="4"
            variant="outline"
            class="w-full"
            @update:model-value="val => updateField('goals', val)"
          />
        </UFormField>
      </section>

      <USeparator />

      <section class="flex flex-col gap-3">
        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {{ $t('pages.studio.builder.inspector.status') }}
        </span>
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
              {{ $t('pages.studio.builder.inspector.is-draft') }}
            </span>
            <span class="text-xs text-gray-400">
              {{ $t('pages.studio.builder.inspector.is-draft-hint') }}
            </span>
          </div>
          <USwitch
            :model-value="lesson.isDraft"
            @update:model-value="(val: boolean) => updateField('isDraft', val)"
          />
        </div>
      </section>

      <USeparator />

      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        :label="$t('pages.studio.builder.delete-lesson-title')"
        block
        @click="emit('delete', lesson)"
      />
    </div>
  </div>
</template>
