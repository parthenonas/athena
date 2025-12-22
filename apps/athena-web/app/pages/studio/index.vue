<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.studio.title')"
    :description="$t('pages.placeholders.studio.desc')"
    icon="i-lucide-presentation"
  />
</template>
