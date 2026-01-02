<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { LessonResponse, CreateLessonRequest, UpdateLessonRequest } from '@athena/types'

const props = defineProps<{
  modelValue: boolean
  courseId: string
  lesson?: LessonResponse | null
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const { createLesson, updateLesson } = useStudio()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isLoading = ref(false)

const schema = z.object({
  title: z.string().min(3, t('validation.min-length', { min: 3 })),
  goals: z.string().optional(),
  isDraft: z.boolean().default(true)
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  title: '',
  goals: '',
  isDraft: true
})

watch(() => props.lesson, (val) => {
  if (val) {
    state.title = val.title
    state.goals = val.goals || ''
    state.isDraft = val.isDraft
  } else {
    state.title = ''
    state.goals = ''
    state.isDraft = true
  }
}, { immediate: true })

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isLoading.value = true
  try {
    const formData = event.data

    if (props.lesson) {
      const payload: UpdateLessonRequest = {
        title: formData.title,
        goals: formData.goals,
        isDraft: formData.isDraft
      }
      await updateLesson(props.lesson.id, payload)
    } else {
      const payload: CreateLessonRequest = {
        courseId: props.courseId,
        title: formData.title,
        goals: formData.goals,
        isDraft: formData.isDraft
      }
      await createLesson(payload)
    }

    emit('success')
    isOpen.value = false
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ lesson ? $t('components.studio.lesson-modal.edit-title') : $t('components.studio.lesson-modal.create-title') }}
          </h3>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            class="-my-1"
            @click="isOpen = false"
          />
        </div>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            :label="$t('components.studio.lesson-modal.title-label')"
            name="title"
            required
          >
            <UInput
              v-model="state.title"
              autofocus
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('components.studio.lesson-modal.goals-label')"
            name="goals"
          >
            <UTextarea
              v-model="state.goals"
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <UFormField
            name="isDraft"
            class="pt-2"
          >
            <UCheckbox
              v-model="state.isDraft"
              :label="$t('components.studio.lesson-modal.draft-label')"
              :description="$t('components.studio.lesson-modal.draft-help')"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              :label="$t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="isOpen = false"
            />
            <UButton
              type="submit"
              :label="$t('common.save')"
              color="primary"
              :loading="isLoading"
            />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
