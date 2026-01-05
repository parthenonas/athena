<script setup lang="ts">
import { Codemirror } from 'vue-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { ProgrammingLanguage } from '@athena/types'

const props = withDefaults(defineProps<{
  modelValue?: string
  language?: ProgrammingLanguage | string
  readOnly?: boolean
  minHeight?: string
  maxHeight?: string
  placeholder?: string
}>(), {
  modelValue: '',
  language: ProgrammingLanguage.Python,
  readOnly: false,
  minHeight: '200px',
  maxHeight: '600px'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'focus' | 'blur'): void
}>()

const colorMode = useColorMode()

const code = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const extensions = computed(() => {
  const exts = [
    EditorView.lineWrapping
  ]

  switch (props.language) {
    case ProgrammingLanguage.Python:
      exts.push(python())
      break
    case ProgrammingLanguage.SQL:
      exts.push(sql())
      break
    default:
      exts.push(python())
  }

  if (colorMode.value === 'dark') {
    exts.push(oneDark)
  }

  if (props.readOnly) {
    exts.push(EditorView.editable.of(false))
  }

  return exts
})

const handleFocus = () => emit('focus')
const handleBlur = () => emit('blur')
</script>

<template>
  <div class="relative w-full overflow-hidden rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 group">
    <Codemirror
      v-model="code"
      :extensions="extensions"
      :style="{ minHeight, maxHeight }"
      :autofocus="false"
      :indent-with-tab="true"
      :tab-size="4"
      :placeholder="placeholder"
      class="text-sm font-mono"
      @focus="handleFocus"
      @blur="handleBlur"
    />
  </div>
</template>

<style>
.cm-editor {
  outline: none !important;
}
.cm-scroller {
  font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
}
.cm-content {
  padding: 12px 0;
}
.cm-gutters {
  background-color: transparent !important;
  border-right: none !important;
  color: #9ca3af !important;
}
</style>
