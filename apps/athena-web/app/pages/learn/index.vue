<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.learn.title')"
    :description="$t('pages.placeholders.learn.desc')"
    icon="i-lucide-book-open"
  />
</template>
