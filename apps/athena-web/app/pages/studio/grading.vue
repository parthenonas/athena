<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.grading.title')"
    :description="$t('pages.placeholders.grading.desc')"
    icon="i-lucide-graduation-cap"
  />
</template>
