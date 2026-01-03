<script setup lang="ts">
import type { TextBlockContent } from '@athena/types'

const props = defineProps<{
  modelValue: TextBlockContent
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: TextBlockContent): void
  (e: 'change' | 'focus' | 'blur'): void
}>()

const contentJson = computed({
  get: () => props.modelValue?.json,
  set: (newJson) => {
    emit('update:modelValue', { ...props.modelValue, json: newJson })
  }
})
</script>

<template>
  <CommonEditor
    v-model="contentJson"
    :read-only="readOnly"
    @change="emit('change')"
    @focus="emit('focus')"
    @blur="emit('blur')"
  />
</template>
