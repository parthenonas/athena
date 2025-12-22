<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <AppPlaceholder
    :title="$t('pages.placeholders.users.title')"
    :description="$t('pages.placeholders.users.desc')"
    icon="i-lucide-users"
  />
</template>
