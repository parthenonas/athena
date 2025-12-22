<script setup lang="ts">
import { ru, en } from '@nuxt/ui/locale'

const { locale } = useI18n()

const uiLocale = computed(() => {
  return locale.value === 'ru' ? ru : en
})
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
