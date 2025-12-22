<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.roles.title')"
    :description="$t('pages.placeholders.roles.desc')"
    icon="i-lucide-shield-check"
  />
</template>
