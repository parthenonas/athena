<template>
  <UDashboardPage>
    <UDashboardSidebar
      collapsible
      resizable
      :min-size="20"
      :default-size="25"
      :max-size="30"
    >
      <template #header>
        <div class="flex items-center gap-2 w-full">
          <UTooltip :text="$t('common.back')">
            <UButton
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="ghost"
              to="/learn"
            />
          </UTooltip>
          <span class="font-display font-bold text-sm truncate text-gray-900 dark:text-white">
            <slot name="course-title">{{ $t('pages.learn.course') }}</slot>
          </span>
        </div>
      </template>

      <template #default>
        <slot name="sidebar" />
      </template>

      <template #footer>
        <div class="flex items-center justify-between w-full px-2">
          <slot name="progress" /> <UColorModeButton size="xs" />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel grow>
      <UDashboardNavbar>
        <template #title>
          <div class="font-medium text-lg">
            <slot name="lesson-title">
              {{ $t('pages.learn.lesson') }}
            </slot>
          </div>
        </template>

        <template #right>
          <slot name="header-actions" />
        </template>
      </UDashboardNavbar>

      <UDashboardPanelContent class="bg-gray-50 dark:bg-gray-950">
        <UPage>
          <UPageBody class="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <slot />
          </UPageBody>
        </UPage>
      </UDashboardPanelContent>
    </UDashboardPanel>
  </UDashboardPage>
</template>
