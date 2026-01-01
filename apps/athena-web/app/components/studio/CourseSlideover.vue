<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { CourseResponse, CreateCourseRequest, UpdateCourseRequest } from '@athena/types'

const props = defineProps<{
  modelValue: boolean
  course?: CourseResponse | null
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const { createCourse, updateCourse } = useStudio()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isLoading = ref(false)

const schema = z.object({
  title: z.string().min(2, t('validation.min-length', { min: 2 })),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  title: '',
  description: '',
  tags: []
})

watch(() => props.course, (val) => {
  if (val) {
    state.title = val.title
    state.description = val.description || ''
    state.tags = [...val.tags]
  } else {
    state.title = ''
    state.description = ''
    state.tags = []
  }
}, { immediate: true })

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isLoading.value = true
  try {
    const formData = event.data

    if (props.course) {
      const payload: UpdateCourseRequest = {
        title: formData.title,
        description: formData.description,
        tags: formData.tags
      }
      await updateCourse(props.course.id, payload)
    } else {
      const payload: CreateCourseRequest = {
        title: formData.title,
        description: formData.description,
        tags: formData.tags,
        isPublished: false
      }
      await createCourse(payload)
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
    :title="course ? $t('components.studio.course-slideover.edit-title') : $t('components.studio.course-slideover.create-title')"
    :description="course ? $t('components.studio.course-slideover.edit-desc') : $t('components.studio.course-slideover.create-desc')"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('components.studio.course-slideover.title-label')"
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
          :label="$t('components.studio.course-slideover.desc-label')"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            :rows="4"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('components.studio.course-slideover.tags-label')"
          name="tags"
        >
          <UInputTags
            v-model="state.tags"
            :placeholder="$t('components.studio.course-slideover.tags-placeholder')"
            class="w-full"
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
    </template>
  </USlideover>
</template>
