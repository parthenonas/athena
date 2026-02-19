<script setup lang="ts">
import { BlockType, BlockRequiredAction, type BlockResponse, type UpdateBlockRequest, type BlockContent } from '@athena/types'

import StudioInspectorCode from '~/components/studio/inspector/Code.vue'
import StudioInspectorText from '~/components/studio/inspector/Text.vue'

const props = defineProps<{
  block: BlockResponse & { content: BlockContent }
}>()

const emit = defineEmits<{
  (e: 'update', id: string, payload: UpdateBlockRequest): void
  (e: 'delete', id: string): void
}>()

const { t } = useI18n()

const settingsComponent = computed(() => {
  switch (props.block.type) {
    case BlockType.Code: return StudioInspectorCode
    case BlockType.Text: return StudioInspectorText
    default: return null
  }
})

const settingsIcon = computed(() => {
  switch (props.block.type) {
    case BlockType.Video: return 'i-lucide-video'
    case BlockType.Image: return 'i-lucide-image'
    case BlockType.Code: return 'i-lucide-code'
    case BlockType.Text: return 'i-lucide-align-left'
    default: return 'i-lucide-box'
  }
})

const actionOptions = computed(() => [
  { label: t('blocks.actions.view'), id: BlockRequiredAction.VIEW },
  { label: t('blocks.actions.interact'), id: BlockRequiredAction.INTERACT },
  { label: t('blocks.actions.submit'), id: BlockRequiredAction.SUBMIT },
  { label: t('blocks.actions.pass'), id: BlockRequiredAction.PASS }
])

const updateContent = (keyOrPayload: string | Record<string, unknown>, value?: unknown) => {
  let mergedContent = { ...props.block.content }

  if (typeof keyOrPayload === 'string') {
    mergedContent = { ...mergedContent, [keyOrPayload]: value }
  } else {
    mergedContent = { ...mergedContent, ...keyOrPayload }
  }

  emit('update', props.block.id, {
    content: mergedContent
  })
}

const updateRoot = (key: keyof BlockResponse, value: unknown) => {
  emit('update', props.block.id, { [key]: value })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-3 py-4 border-b border-gray-200 dark:border-gray-800">
      <div class="p-2 bg-gray-100 max-h-9 dark:bg-gray-800 rounded-md">
        <UIcon
          :name="settingsIcon"
          class="w-5 h-5 text-primary-500"
        />
      </div>
      <div>
        <div class="text-xs text-gray-500 font-bold uppercase tracking-wider">
          {{ $t('pages.studio.builder.inspector.type') }}
        </div>
        <div class="text-sm font-medium capitalize">
          {{ $t(`blocks.type.${block.type}`) }}
        </div>
      </div>
    </div>

    <div class="overflow-y-auto py-4 space-y-6">
      <section class="flex flex-col gap-3">
        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {{ $t('pages.studio.builder.inspector.general') }}
        </span>

        <UFormField :label="$t('pages.studio.builder.inspector.required-action')">
          <USelectMenu
            :model-value="block.requiredAction"
            :items="actionOptions"
            value-key="id"
            class="w-full"
            @update:model-value="val => updateRoot('requiredAction', val)"
          />
        </UFormField>
      </section>

      <component
        :is="settingsComponent"
        v-if="settingsComponent"
        :content="block.content"
        @update="updateContent"
      />

      <div
        v-else
        class="text-sm text-gray-500 italic text-center py-4"
      >
        {{ $t('pages.studio.builder.inspector.no-settings') }}
      </div>

      <USeparator />

      <UButton
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        :label="$t('common.delete')"
        block
        @click="emit('delete', block.id)"
      />
    </div>
  </div>
</template>
