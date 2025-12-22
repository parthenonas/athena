<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.dashboard.title')"
    :description="$t('pages.placeholders.dashboard.desc')"
    icon="i-lucide-layout-dashboard"
  />
</template>
