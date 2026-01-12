<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { CreateCohortRequest, UpdateCohortRequest, FilterInstructorRequest, InstructorResponse } from '@athena/types'
import type { SelectMenuItem } from '@nuxt/ui'
import { CalendarDate } from '@internationalized/date'

const props = defineProps<{
  modelValue: boolean
  cohortId?: string | null
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const { createCohort, updateCohort, fetchCohort, fetchInstructors, fetchInstructor } = useTeaching()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isLoading = ref(false)
const search = ref('')

const schema = z.object({
  name: z.string().min(3, t('validation.min-length', { min: 3 })),
  instructorId: z.string().uuid(),
  startDate: z.any().optional(),
  endDate: z.any().optional()
})

type Schema = z.output<typeof schema>

const state = reactive({
  name: '',
  instructorId: '',
  // eslint-disable-next-line
  startDate: undefined as any,
  // eslint-disable-next-line
  endDate: undefined as any
})

const filters = reactive<FilterInstructorRequest>({
  page: 1,
  limit: 20,
  search: undefined,
  sortBy: 'title',
  sortOrder: 'ASC'
})

watchDebounced(search, (val) => {
  filters.search = val
}, { debounce: 500, maxWait: 1000 })

const { data: fetchedInstructors, pending: pendingInstructors } = await fetchInstructors(filters)
const specificInstructor = ref<InstructorResponse | null>(null)

const instructorOptions = computed<SelectMenuItem[]>(() => {
  const list = fetchedInstructors.value?.data || []
  const result = [...list]

  if (specificInstructor.value && !list.find(i => i.id === specificInstructor.value?.id)) {
    result.push(specificInstructor.value)
  }

  return result.map(inst => ({
    id: inst.id,
    label: inst.title
  }))
})

const toCalendarDateTime = (dateStr?: string | Date | null): CalendarDate | undefined => {
  if (!dateStr) return undefined
  const d = new Date(dateStr)
  return new CalendarDate(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate()
  )
}

const toNativeDate = (cd?: CalendarDate): Date | undefined => {
  if (!cd) return undefined
  return new Date(cd.year, cd.month - 1, cd.day)
}

watch(isOpen, async (val) => {
  if (!val) return

  isLoading.value = true
  try {
    if (props.cohortId) {
      const cohort = await fetchCohort(props.cohortId)
      if (cohort) {
        state.name = cohort.name
        state.instructorId = cohort.instructorId!
        state.startDate = toCalendarDateTime(cohort.startDate)
        state.endDate = toCalendarDateTime(cohort.endDate)

        const currentList = fetchedInstructors.value?.data || []
        const instructorExists = currentList.find(i => i.id === cohort.instructorId)
        if (cohort.instructorId && !instructorExists) {
          try {
            const instructorData = await fetchInstructor(cohort.instructorId)
            specificInstructor.value = instructorData
          } catch (e) {
            console.error('Failed to load specific account', e)
          }
        }
      }
    } else {
      state.name = ''
      state.instructorId = ''
      state.startDate = undefined
      state.endDate = undefined
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

    const payloadBase = {
      name: formData.name,
      instructorId: formData.instructorId,
      startDate: toNativeDate(formData.startDate),
      endDate: toNativeDate(formData.endDate)
    }

    if (props.cohortId) {
      const payload: UpdateCohortRequest = { ...payloadBase }
      await updateCohort(props.cohortId, payload)
    } else {
      const payload: CreateCohortRequest = {
        ...payloadBase,
        startDate: payloadBase.startDate || new Date()
      }
      await createCohort(payload)
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
    :title="cohortId ? $t('pages.teaching.cohorts.edit-title') : $t('pages.teaching.cohorts.create-title')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="cohort-form"
        :schema="schema"
        :state="state"
        class="h-full flex flex-col gap-6"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('pages.teaching.cohorts.name-label')"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            autofocus
            class="w-full"
            placeholder="e.g. CS-101 Spring 2026"
          />
        </UFormField>

        <UFormField
          :label="$t('pages.teaching.cohorts.instructor-label')"
          name="instructorId"
          required
        >
          <USelectMenu
            v-model:search-term="search"
            v-model="state.instructorId"
            :items="instructorOptions"
            :loading="pendingInstructors"
            value-key="id"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField
            :label="$t('pages.teaching.cohorts.start-date-label')"
            name="startDate"
          >
            <UInputDate
              v-model="state.startDate"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('pages.teaching.cohorts.end-date-label')"
            name="endDate"
          >
            <UInputDate
              v-model="state.endDate"
              class="w-full"
            />
          </UFormField>
        </div>
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
          form="cohort-form"
          :label="$t('common.save')"
          color="primary"
          :loading="isLoading"
        />
      </div>
    </template>
  </USlideover>
</template>
