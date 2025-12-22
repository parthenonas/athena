<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.files.title')"
    :description="$t('pages.placeholders.files.desc')"
    icon="i-lucide-folder-open"
  />
</template>
