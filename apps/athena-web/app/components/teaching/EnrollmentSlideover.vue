<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type {
  CreateEnrollmentRequest,
  UpdateEnrollmentRequest,
  AccountResponse,
  CohortResponse,
  FilterCohortRequest,
  FilterAccountRequest
} from '@athena/types'
import { EnrollmentStatus } from '@athena/types'
import type { SelectMenuItem } from '@nuxt/ui'

const props = defineProps<{
  modelValue: boolean
  enrollmentId?: string | null
  initialCohortId?: string
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const { createEnrollment, updateEnrollment, fetchEnrollment, fetchCohorts } = useTeaching()
const { fetchAccounts } = useAccounts()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isLoading = ref(false)

const schema = z.object({
  userId: z.string().uuid(),
  cohortId: z.string().uuid(),
  status: z.nativeEnum(EnrollmentStatus).optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  userId: '',
  cohortId: '',
  status: EnrollmentStatus.Active
})

const statusOptions = computed(() => Object.values(EnrollmentStatus).map(status => ({
  value: status,
  label: t(`enrollment-statuses.${status}`)
})))

const cohortFilters = reactive<FilterCohortRequest>({
  search: undefined,
  instructorId: undefined,
  page: 1,
  limit: 10,
  sortBy: 'name',
  sortOrder: 'asc'
})
const { data: fetchedCohorts, pending: pendingCohorts } = await fetchCohorts(cohortFilters)

const cohortOptions = computed<SelectMenuItem[]>(() => {
  return (fetchedCohorts.value?.data || []).map(c => ({ id: c.id, label: c.name }))
})

const accountFilters = reactive<FilterAccountRequest>({
  search: undefined,
  page: 1,
  limit: 10,
  sortBy: 'login',
  sortOrder: 'ASC'
})
const { data: fetchedAccounts, pending: pendingAccounts } = await fetchAccounts(accountFilters)

const specificUser = ref<AccountResponse | null>(null)
const specificCohort = ref<CohortResponse | null>(null)

const userOptions = computed<SelectMenuItem[]>(() => {
  const list = fetchedAccounts.value?.data || []
  if (specificUser.value && !list.find(u => u.id === specificUser.value?.id)) {
    list.push(specificUser.value)
  }
  return list.map(u => ({ id: u.id, label: u.login }))
})

watch(isOpen, async (val) => {
  if (!val) return

  isLoading.value = true
  try {
    if (props.enrollmentId) {
      const enrollment = await fetchEnrollment(props.enrollmentId)
      if (enrollment) {
        state.userId = enrollment.ownerId
        state.cohortId = enrollment.cohortId
        state.status = enrollment.status
      }
    } else {
      state.userId = ''
      state.cohortId = props.initialCohortId || ''
      state.status = EnrollmentStatus.Active
      specificUser.value = null
      specificCohort.value = null
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}, { immediate: true })

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isLoading.value = true
  try {
    const formData = event.data

    if (props.enrollmentId) {
      const payload: UpdateEnrollmentRequest = {
        status: formData.status
      }
      await updateEnrollment(props.enrollmentId, payload)
    } else {
      const payload: CreateEnrollmentRequest = {
        ownerId: formData.userId,
        cohortId: formData.cohortId,
        status: formData.status || EnrollmentStatus.Active
      }
      await createEnrollment(payload)
    }

    emit('success')
    isOpen.value = false
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="enrollmentId ? $t('pages.teaching.enrollments.edit-title') : $t('pages.teaching.enrollments.create-title')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="enrollment-form"
        :schema="schema"
        :state="state"
        class="h-full flex flex-col gap-6"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('pages.teaching.enrollments.cohort-label')"
          name="cohortId"
          required
        >
          <USelectMenu
            v-model:search-term="cohortFilters.search"
            v-model="state.cohortId"
            :items="cohortOptions"
            :loading="pendingCohorts"
            value-key="id"
            class="w-full"
            :disabled="!!enrollmentId || !!initialCohortId"
          />
        </UFormField>

        <UFormField
          :label="$t('pages.teaching.enrollments.student-label')"
          name="userId"
          required
        >
          <USelectMenu
            v-model:search-term="accountFilters.search"
            v-model="state.userId"
            :items="userOptions"
            :loading="pendingAccounts"
            value-key="id"
            class="w-full"
            :disabled="!!enrollmentId"
          />
        </UFormField>

        <UFormField
          :label="$t('pages.teaching.enrollments.status-label')"
          name="status"
        >
          <USelect
            v-model="state.status"
            :items="statusOptions"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="isOpen = false"
        />
        <UButton
          type="submit"
          form="enrollment-form"
          :label="$t('common.save')"
          color="primary"
          :loading="isLoading"
        />
      </div>
    </template>
  </USlideover>
</template>
