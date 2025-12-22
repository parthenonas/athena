<script setup lang="ts">
import { ru, en } from '@nuxt/ui/locale'

const { locale } = useI18n()
const authStore = useAuthStore()

const uiLocale = computed(() => {
  return locale.value === 'ru' ? ru : en
})

watchEffect(() => {
  if (authStore.token && !authStore.user) {
    authStore.getMe()
  }
})
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
