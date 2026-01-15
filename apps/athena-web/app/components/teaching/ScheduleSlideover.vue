<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { CreateScheduleRequest, UpdateScheduleRequest } from '@athena/types'
import { CalendarDateTime } from '@internationalized/date'

const props = defineProps<{
  modelValue: boolean
  scheduleId?: string | null
  cohortId: string
  lessonId: string
  lessonTitle: string
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const { createSchedule, updateSchedule, fetchSchedule } = useTeaching()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isLoading = ref(false)

type ScheduleMode = 'manual' | 'scheduled'
const mode = ref<ScheduleMode>('scheduled')

const schema = z.object({
  startAt: z.any().optional(),
  endAt: z.any().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  // eslint-disable-next-line
  startAt: undefined as any,
  // eslint-disable-next-line
  endAt: undefined as any
})

// Теперь используем t() для переводов
const modeOptions = computed(() => [
  {
    value: 'scheduled',
    label: t('pages.teaching.schedule.modes.scheduled.label'),
    description: t('pages.teaching.schedule.modes.scheduled.description')
  },
  {
    value: 'manual',
    label: t('pages.teaching.schedule.modes.manual.label'),
    description: t('pages.teaching.schedule.modes.manual.description')
  }
])

watch(isOpen, async (val) => {
  if (!val) return

  isLoading.value = true
  try {
    if (props.scheduleId) {
      const schedule = await fetchSchedule(props.scheduleId)
      if (schedule) {
        if (schedule.isOpenManually) {
          mode.value = 'manual'
          state.startAt = undefined
          state.endAt = undefined
        } else {
          mode.value = 'scheduled'
          state.startAt = toCalendarDateTime(schedule.startAt)
          state.endAt = toCalendarDateTime(schedule.endAt)
        }
      }
    } else {
      mode.value = 'scheduled'
      state.startAt = undefined
      state.endAt = undefined
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
    const isManual = mode.value === 'manual'

    const payloadBase = {
      isOpenManually: isManual,
      startAt: isManual ? null : (toNativeDate(state.startAt) || null),
      endAt: isManual ? null : (toNativeDate(state.endAt) || null)
    }

    if (props.scheduleId) {
      await updateSchedule(props.scheduleId, payloadBase as UpdateScheduleRequest)
    } else {
      const payload: CreateScheduleRequest = {
        ...payloadBase,
        cohortId: props.cohortId,
        lessonId: props.lessonId
      }
      await createSchedule(payload)
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
    :title="scheduleId ? $t('pages.teaching.schedule.edit-title') : $t('pages.teaching.schedule.create-title')"
    :description="lessonTitle"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="schedule-form"
        :schema="schema"
        :state="state"
        class="h-full flex flex-col gap-8"
        @submit="onSubmit"
      >
        <div class="space-y-3">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
            {{ $t('pages.teaching.schedule.mode-label') }}
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="option in modeOptions"
              :key="option.value"
              class="cursor-pointer border rounded-lg p-3 flex flex-col gap-1 transition-colors"
              :class="mode === option.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 ring-1 ring-primary-500'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="mode = option.value as ScheduleMode"
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-4 h-4 rounded-full border flex items-center justify-center"
                  :class="mode === option.value ? 'border-primary-500' : 'border-gray-400'"
                >
                  <div
                    v-if="mode === option.value"
                    class="w-2 h-2 rounded-full bg-primary-500"
                  />
                </div>
                <span class="font-medium text-sm">{{ option.label }}</span>
              </div>
              <p class="text-xs text-gray-500 pl-6">
                {{ option.description }}
              </p>
            </div>
          </div>
        </div>

        <USeparator />

        <div
          v-if="mode === 'scheduled'"
          class="space-y-6"
        >
          <UAlert
            icon="i-lucide-clock"
            color="neutral"
            variant="subtle"
            :title="$t('pages.teaching.schedule.interval-settings.title')"
            :description="$t('pages.teaching.schedule.interval-settings.description')"
          />

          <div class="grid grid-cols-1 gap-6">
            <UFormField
              :label="$t('pages.teaching.schedule.start-at-label')"
              name="startAt"
              :help="$t('pages.teaching.schedule.start-at-help')"
            >
              <div class="flex items-center gap-2">
                <UInputDate
                  v-model="state.startAt"
                  class="w-full"
                  :placeholder="new CalendarDateTime(2025, 1, 1, 9, 0)"
                  granularity="minute"
                  icon="i-lucide-calendar-arrow-up"
                />
                <UButton
                  v-if="state.startAt"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="state.startAt = undefined"
                />
              </div>
            </UFormField>

            <UFormField
              :label="$t('pages.teaching.schedule.end-at-label')"
              name="endAt"
              :help="$t('pages.teaching.schedule.end-at-help')"
            >
              <div class="flex items-center gap-2">
                <UInputDate
                  v-model="state.endAt"
                  class="w-full"
                  :placeholder="new CalendarDateTime(2025, 2, 1, 23, 59)"
                  granularity="minute"
                  icon="i-lucide-calendar-arrow-down"
                />
                <UButton
                  v-if="state.endAt"
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="state.endAt = undefined"
                />
              </div>
            </UFormField>
          </div>
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
        >
          <div class="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            <UIcon
              name="i-lucide-lock-open"
              class="w-6 h-6"
            />
          </div>
          <div>
            <h3 class="font-medium text-gray-900 dark:text-white">
              {{ $t('pages.teaching.schedule.full-access.title') }}
            </h3>
            <p class="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
              {{ $t('pages.teaching.schedule.full-access.description') }}
            </p>
          </div>
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
          form="schedule-form"
          :label="$t('common.save')"
          color="primary"
          :loading="isLoading"
        />
      </div>
    </template>
  </USlideover>
</template>
