<script setup lang="ts">
const { t, locale, setLocale } = useI18n()

const toggleLang = () => {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}
const authStore = useAuthStore()

const userItems = computed(() => [
  [
    {
      label: authStore.user?.login,
      slot: 'account',
      disabled: true
    }
  ],
  [
    {
      label: t('layouts.shared.menu.settings'),
      icon: 'i-lucide-settings',
      to: '#'
    }
  ],
  [
    {
      label: t('layouts.shared.menu.logout'),
      icon: 'i-lucide-log-out',
      onSelect: () => authStore.logout()
    }
  ]
])
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
          :label="locale === 'ru' ? 'RU' : 'EN'"
          class="font-display font-bold"
          @click="toggleLang"
        />
        <UColorModeButton />

        <div class="h-4 w-px bg-gray-200 dark:bg-gray-800 mx-2 hidden sm:block" />

        <UDropdownMenu
          v-if="authStore.isLogged && authStore.user"
          :items="userItems"
        >
          <button class="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-full">
            <UAvatar
              :alt="authStore.user.login"
              size="sm"
              class="ring-2 ring-primary-500/20 hover:ring-primary-500 transition-all"
            />
          </button>

          <template #account="{ item }">
            <div class="text-left">
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {{ $t("layouts.shared.menu.signed-in-as") }}
              </p>
              <p class="truncate font-display font-bold text-gray-900 dark:text-white">
                {{ item.label }}
              </p>
            </div>
          </template>
        </UDropdownMenu>

        <UButton
          v-else
          to="/auth/login"
          :label="$t('layouts.shared.log-in')"
          icon="i-lucide-log-in"
          color="primary"
          variant="ghost"
          class="font-display font-bold"
        />
      </template>
    </UHeader>

    <UMain>
      <UContainer>
        <slot />
      </UContainer>
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
