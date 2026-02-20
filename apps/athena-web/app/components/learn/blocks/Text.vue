<script setup lang="ts">
import type { TextBlockContent } from '@athena/types'

defineProps<{
  content: TextBlockContent
}>()
</script>

<template>
  <div class="w-full text-gray-800 dark:text-gray-200">
    <CommonEditor
      :model-value="content.json"
      :read-only="true"
    />
  </div>
</template>
