<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.admin-settings.title')"
    :description="$t('pages.placeholders.admin-settings.desc')"
    icon="i-lucide-settings-2"
  />
</template>
