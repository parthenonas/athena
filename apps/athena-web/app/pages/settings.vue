<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.settings.title')"
    :description="$t('pages.placeholders.settings.desc')"
    icon="i-lucide-settings"
  />
</template>
