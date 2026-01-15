<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const { t } = useI18n()
const { fetchCohort } = useTeaching()

const cohortId = route.params.id as string

const { data: cohort, status, refresh } = await useAsyncData(
  `cohort-${cohortId}`,
  () => fetchCohort(cohortId)
)

const links = computed(() => [{
  label: t('pages.teaching.cohorts.tabs.overview'),
  icon: 'i-lucide-layout-dashboard',
  slot: 'overview'
}, {
  label: t('pages.teaching.cohorts.tabs.students'),
  icon: 'i-lucide-users',
  slot: 'students'
}, {
  label: t('pages.teaching.cohorts.tabs.schedule'),
  icon: 'i-lucide-calendar',
  slot: 'schedule'
}])

const title = computed(() => {
  if (status.value === 'pending') {
    return t('pages.teaching.cohorts.loading')
  } else if (!cohort.value) {
    return t('pages.teaching.cohorts.unknown')
  } else {
    return cohort.value?.name
  }
})
</script>

<template>
  <UDashboardPage>
    <UDashboardNavbar :title="title">
      <template #leading>
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          @click="$router.back()"
        />
      </template>
      <template #right>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="status === 'pending'"
          @click="() => refresh()"
        />
      </template>
    </UDashboardNavbar>

    <UPageBody class="p-0">
      <div
        v-if="status === 'pending'"
        class="p-4"
      >
        <USkeleton class="h-8 w-1/3 mb-4" />
        <USkeleton class="h-64 w-full" />
      </div>

      <div
        v-else-if="!cohort"
        class="p-4 text-center"
      >
        <p class="text-gray-500">
          {{ t('pages.teaching.cohorts.not-found') }}
        </p>
      </div>

      <div
        v-else
        class="flex flex-col h-full"
      >
        <UTabs
          :items="links"
          class="w-full"
        >
          <template #overview>
            <div class="p-4">
              <TeachingCohortOverview :cohort="cohort" />
            </div>
          </template>

          <template #students>
            <div class="p-4">
              <p class="text-gray-500">
                <TeachingCohortEnrollments :cohort-id="cohortId" />
              </p>
            </div>
          </template>

          <template #schedule>
            <div class="p-4">
              <p class="text-gray-500">
                Schedule Builder goes here...
              </p>
            </div>
          </template>
        </UTabs>
      </div>
    </UPageBody>
  </UDashboardPage>
</template>
