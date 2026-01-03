<script setup lang="ts">
import type { VideoBlockContent } from '@athena/types'

defineProps<{
  content: VideoBlockContent
}>()

const emit = defineEmits<{
  (e: 'update', key: keyof VideoBlockContent, value: unknown): void
}>()
</script>

<template>
  <div class="space-y-4">
    <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {{ $t('pages.studio.builder.inspector.blocks.video.settings') }}
    </span>

    <UFormField
      :label="$t('pages.studio.builder.inspector.blocks.video.url')"
      name="url"
    >
      <UInput
        :model-value="content.url"
        placeholder="https://..."
        icon="i-lucide-link"
        @update:model-value="val => emit('update', 'url', val)"
      />
    </UFormField>

    <div class="grid grid-cols-2 gap-2">
      <UFormField :label="$t('pages.studio.builder.inspector.blocks.video.duration')">
        <UInput
          type="number"
          :model-value="content.duration"
          @update:model-value="val => emit('update', 'duration', Number(val))"
        />
      </UFormField>
      <UFormField :label="$t('pages.studio.builder.inspector.blocks.video.size')">
        <UInput
          type="number"
          :model-value="content.size"
          disabled
          color="neutral"
          variant="subtle"
        />
      </UFormField>
    </div>
  </div>
</template>
