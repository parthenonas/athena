<script setup lang="ts">
const { t } = useI18n()

const heroLinks = computed(() => [
  {
    label: t('pages.index.hero.start-btn'),
    trailingIcon: 'i-lucide-power',
    to: '/auth/login',
    color: 'primary' as const,
    variant: 'solid' as const
  },
  {
    label: t('pages.index.hero.docs-btn'),
    trailingIcon: 'i-lucide-book-open',
    to: '/docs',
    color: 'neutral' as const,
    variant: 'outline' as const
  }
])
</script>

<template>
  <div class="flex items-center justify-center relative z-10">
    <UPageCTA
      :title="t('pages.index.hero.title')"
      :description="t('pages.index.hero.subtitle')"
      orientation="horizontal"
      :links="heroLinks"
      :ui="{
        title: 'font-display font-bold text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight text-gray-900 dark:text-white',
        description: 'font-body text-lg text-gray-500 dark:text-gray-400 mt-4'
      }"
    >
      <div class="hidden lg:block">
        <UColorModeImage
          light="/images/athena-light.png"
          dark="/images/athena-dark.png"
          alt="Athena Platform"
          class="h-full object-cover mask-[radial-gradient(closest-side,black_20%,transparent_100%)]"
        />
      </div>
    </UPageCTA>
  </div>
</template>
