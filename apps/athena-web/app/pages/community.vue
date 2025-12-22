<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.community.title')"
    :description="$t('pages.placeholders.community.desc')"
    icon="i-lucide-messages-square"
  />
</template>
