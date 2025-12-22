<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.courses.title')"
    :description="$t('pages.placeholders.courses.desc')"
    icon="i-lucide-library"
  />
</template>
