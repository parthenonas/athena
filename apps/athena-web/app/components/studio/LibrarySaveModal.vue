<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps<{
  modelValue: boolean
  loading?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'save'])

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const schema = z.object({
  tags: z.array(z.string()).default([])
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  tags: []
})

watch(isOpen, (val) => {
  if (val) state.tags = []
})

const onSubmit = (event: FormSubmitEvent<Schema>) => {
  emit('save', event.data.tags)
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
            {{ $t('components.studio.library-save-modal.title') }}
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
            :label="$t('components.studio.library-save-modal.tags-label')"
            name="tags"
          >
            <UInputTags
              v-model="state.tags"
              :placeholder="$t('components.studio.library-save-modal.tags-placeholder')"
              class="w-full"
              autofocus
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
              :loading="loading"
            />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
