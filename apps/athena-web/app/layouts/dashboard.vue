<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t, locale, setLocale } = useI18n()

const toggleLang = () => {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}

const authStore = useAuthStore()

const sharedItems = computed<NavigationMenuItem[]>(() => ([
  {
    label: t('pages.dashboard.dashboard'),
    icon: 'i-lucide-layout-dashboard',
    to: '/dashboard'
  }
]))

const studentItems = computed<NavigationMenuItem[]>(() => ([
  {
    label: t('pages.dashboard.my-learning'),
    icon: 'i-lucide-book-open',
    to: '/learn',
    badge: '2'
  },
  {
    label: t('pages.dashboard.schedule'),
    icon: 'i-lucide-calendar',
    to: '/learn/schedule'
  },
  {
    label: t('pages.dashboard.my-files'),
    icon: 'i-lucide-folder-open',
    to: '/files',
    description: 'Personal storage'
  },
  {
    label: t('pages.dashboard.community'),
    icon: 'i-lucide-messages-square',
    to: '/community'
  }
]))

const studioItems = computed<NavigationMenuItem[]>(() => ([
  {
    label: t('pages.dashboard.studio-overview'),
    icon: 'i-lucide-presentation',
    to: '/studio'
  },
  {
    label: t('pages.dashboard.course-manager'),
    icon: 'i-lucide-library',
    to: '/studio/courses'
  },
  {
    label: t('pages.dashboard.assignments'),
    icon: 'i-lucide-graduation-cap',
    to: '/studio/grading',
    badge: '12'
  }
]))

const adminItems = computed<NavigationMenuItem[]>(() => ([
  {
    label: t('pages.dashboard.users'),
    icon: 'i-lucide-users',
    to: '/admin/users'
  },
  {
    label: t('pages.dashboard.roles'),
    icon: 'i-lucide-shield-check',
    to: '/admin/roles'
  },
  {
    label: t('pages.dashboard.files'),
    icon: 'i-lucide-hard-drive',
    to: '/admin/files'
  },
  {
    label: t('pages.dashboard.system-settings'),
    icon: 'i-lucide-settings-2',
    to: '/admin/settings'
  }
]))

const footerMenuItems = computed(() => [
  [
    {
      label: authStore.user?.login || 'User',
      slot: 'account',
      disabled: true
    }
  ],
  [
    {
      label: t('pages.dashboard.menu.settings'),
      icon: 'i-lucide-settings',
      to: '/settings'
    }
  ],
  [
    {
      label: t('pages.dashboard.menu.logout'),
      icon: 'i-lucide-log-out',
      onSelect: () => authStore.logout()
    }
  ]
])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
    >
      <template #resize-handle="{ onMouseDown, onTouchStart, onDoubleClick }">
        <UDashboardResizeHandle
          class="after:absolute after:inset-y-0 after:right-0 after:w-px hover:after:bg-(--ui-border-accented) after:transition"
          @mousedown="onMouseDown"
          @touchstart="onTouchStart"
          @dblclick="onDoubleClick"
        />
      </template>
      <template #default="{ collapsed }">
        <div class="flex items-center gap-3 ">
          <NuxtLink
            to="/"
            class="font-display  font-bold text-2xl tracking-tighter text-gray-900 dark:text-white hover:text-primary-500 transition-colors cursor-pointer"
            :class="{
              'w-full text-center': collapsed
            }"
          >
            {{ collapsed ? "A" : "ATHENA" }}
          </NuxtLink>
          <UBadge
            v-if="!collapsed"
            label="LMS"
            variant="solid"
            color="primary"
            size="md"
            class="font-display font-bold rounded-none"
          />
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="sharedItems"
          orientation="vertical"
        />

        <USeparator
          v-if="collapsed"
          class="my-2"
        />
        <div
          v-else
          class="px-2 mb-2 mt-2"
        >
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">{{ $t('pages.dashboard.learn') }}</span>
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="studentItems"
          orientation="vertical"
        />

        <USeparator
          v-if="collapsed"
          class="my-2"
        />
        <div
          v-else
          class="px-2 mb-2 mt-2"
        >
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">{{ $t('pages.dashboard.studio') }}</span>
        </div>
        <UNavigationMenu
          :collapsed="collapsed"
          :items="studioItems"
          orientation="vertical"
        />

        <USeparator
          v-if="collapsed"
          class="my-2"
        />
        <div
          v-else
          class="px-2 mb-2 mt-2"
        >
          <span class="text-xs font-bold text-error-400 uppercase tracking-wider">{{ $t('pages.dashboard.admin') }}</span>
        </div>
        <UNavigationMenu
          :collapsed="collapsed"
          :items="adminItems"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex flex-col items-center justify-between gap-2 w-full">
          <UDropdownMenu
            v-if="authStore.user"
            :items="footerMenuItems"
            :popper="{ placement: 'right-start' }"
            class="w-full"
          >
            <UButton
              :avatar="{
                alt: authStore.user.login
              }"
              :label="collapsed ? undefined : authStore.user.login"
              color="neutral"
              variant="ghost"
              class="w-full justify-start"
              :block="collapsed"
            />

            <template #account="{ item }">
              <div class="text-left">
                <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {{ $t('pages.dashboard.menu.signed-in-as') }}
                </p>
                <p class="truncate font-display font-bold text-gray-900 dark:text-white">
                  {{ item.label }}
                </p>
              </div>
            </template>
          </UDropdownMenu>

          <div
            :class="{
              'flex flex-row justify-start gap-2 items-center w-full': !collapsed,
              'flex flex-col gap-2 items-center': collapsed
            }"
          >
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              :icon="collapsed ? undefined : 'i-lucide-languages'"
              :label="locale === 'ru' ? 'RU' : 'EN'"
              class="font-display font-bold"
              @click="toggleLang"
            />
            <UColorModeButton />
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <div class="flex flex-col items-start flex-1 min-w-0 overflow-auto">
      <div class="w-full max-w-4xl">
        <NuxtPage />
      </div>
    </div>
  </UDashboardGroup>
</template>
