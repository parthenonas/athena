<script setup lang="ts">
import type { ImageBlockContent } from '@athena/types'

defineProps<{
  content: ImageBlockContent
}>()

const emit = defineEmits<{
  (e: 'update', key: keyof ImageBlockContent, value: unknown): void
}>()
</script>

<template>
  <div class="space-y-4">
    <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {{ $t('pages.studio.builder.inspector.blocks.image.settings') }}
    </span>

    <div
      v-if="content.url"
      class="aspect-video rounded-md overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50"
    >
      <img
        :src="content.url"
        class="w-full h-full object-cover"
      >
    </div>

    <UFormField :label="$t('pages.studio.builder.inspector.blocks.image.url')">
      <UInput
        :model-value="content.url"
        placeholder="https://..."
        icon="i-lucide-image"
        @update:model-value="val => emit('update', 'url', val)"
      />
    </UFormField>

    <UFormField :label="$t('pages.studio.builder.inspector.blocks.image.caption')">
      <UInput
        :model-value="content.caption"
        :placeholder="$t('pages.studio.builder.inspector.blocks.image.caption-placeholder')"
        @update:model-value="val => emit('update', 'caption', val)"
      />
    </UFormField>
  </div>
</template>
