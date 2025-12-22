<script setup lang="ts">
definePageMeta({
  layout: false
})

const { locale, setLocale } = useI18n()

const toggleLang = () => {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}
</script>

<template>
  <div class="min-h-screen flex flex-col font-body">
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-[linear-gradient(to_right,var(--color-gray-200)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,var(--color-gray-800)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-gray-200)_1px,transparent_1px)] dark:bg-[linear-gradient(to_bottom,var(--color-gray-800)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
    </div>

    <UHeader :toggle="false">
      <template #left>
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/"
            class="font-display font-bold text-2xl tracking-tighter text-gray-900 dark:text-white hover:text-primary-500 transition-colors cursor-pointer"
          >
            ATHENA
          </NuxtLink>
          <UBadge
            label="LMS"
            variant="solid"
            color="primary"
            size="md"
            class="font-display font-bold rounded-none"
          />
        </div>
      </template>

      <template #right>
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-languages"
          :label="locale === 'ru' ? 'EN' : 'RU'"
          class="font-display font-bold"
          @click="toggleLang"
        />
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain class="flex-1 flex flex-col relative min-h-0!">
      <NuxtPage />
    </UMain>

    <UFooter class="mt-auto">
      <template #left>
        <p class="text-gray-500 dark:text-gray-400 text-sm font-body">
          © {{ new Date().getFullYear() }} Athena LMS.
        </p>
      </template>

      <template #right>
        <UButton
          icon="i-simple-icons-github"
          color="neutral"
          variant="ghost"
          to="https://github.com/shekshuev/athena-lms"
          target="_blank"
        />
      </template>
    </UFooter>
  </div>
</template>
