<script setup lang="ts">
import athenaDarkImg from '@/assets/images/athena-dark.png'
import athenaLightImg from '@/assets/images/athena-light.png'

definePageMeta({
  layout: false
})

const { t, locale, setLocale } = useI18n()

const toggleLang = () => {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}

const colorMode = useColorMode()

const heroLinks = computed(() => [
  {
    label: t('hero.start_btn'),
    trailingIcon: 'i-lucide-power',
    to: '/login',
    color: 'primary' as const,
    variant: 'solid' as const
  },
  {
    label: t('hero.docs_btn'),
    trailingIcon: 'i-lucide-book-open',
    to: '#',
    color: 'neutral' as const,
    variant: 'outline' as const
  }
])
</script>

<template>
  <div class="min-h-screen flex flex-col font-body selection:bg-primary-500/30 selection:text-primary-200">
    <div class="fixed inset-0 z-0 pointer-events-none">
      <div class="absolute inset-0 bg-[linear-gradient(to_right,var(--color-gray-200)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,var(--color-gray-800)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
      <div class="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-gray-200)_1px,transparent_1px)] dark:bg-[linear-gradient(to_bottom,var(--color-gray-800)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
    </div>

    <UHeader>
      <template #left>
        <div class="flex items-center gap-3">
          <span class="font-display font-bold text-2xl tracking-tighter text-gray-900 dark:text-white hover:text-primary-500 transition-colors cursor-pointer">
            ATHENA
          </span>
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
        <UColorModeSwitch />
      </template>
    </UHeader>

    <UMain class="flex items-center justify-center relative z-10">
      <UPageCTA
        :title="t('hero.title')"
        :description="t('hero.subtitle')"
        orientation="horizontal"
        :links="heroLinks"
        :ui="{
          title: 'font-display font-bold text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-gray-900 dark:text-white',
          description: 'font-body text-lg text-gray-500 dark:text-gray-400 mt-4'
        }"
      >
        <img
          :src="colorMode.value === 'dark' ? athenaDarkImg : athenaLightImg"
          alt="Athena Platform"
          class="hidden lg:block h-full object-cover opacity-90 mask-[radial-gradient(closest-side,black_20%,transparent_100%)]"
        >
      </UPageCTA>
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
