<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.schedule.title')"
    :description="$t('pages.placeholders.schedule.desc')"
    icon="i-lucide-calendar"
  />
</template>
