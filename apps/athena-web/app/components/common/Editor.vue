<script setup lang="ts">
import type { EditorSuggestionMenuItem, EditorToolbarItem } from '@nuxt/ui'

const props = defineProps<{
  modelValue?: Record<string, unknown>
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
  (e: 'change' | 'focus' | 'blur'): void
}>()

const { t } = useI18n()

const content = computed({
  get: () => {
    if (!props.modelValue || Object.keys(props.modelValue).length === 0) {
      return { type: 'doc', content: [{ type: 'paragraph' }] }
    }
    return props.modelValue
  },
  set: (json) => {
    emit('update:modelValue', json)
    emit('change')
  }
})

const bubbleItems = computed<EditorToolbarItem[][]>(() => [
  [{
    kind: 'mark',
    mark: 'bold',
    icon: 'i-lucide-bold',
    tooltip: { text: t('editor.bold') }
  }, {
    kind: 'mark',
    mark: 'italic',
    icon: 'i-lucide-italic',
    tooltip: { text: t('editor.italic') }
  }, {
    kind: 'mark',
    mark: 'underline',
    icon: 'i-lucide-underline',
    tooltip: { text: t('editor.underline') }
  }, {
    kind: 'mark',
    mark: 'code',
    icon: 'i-lucide-code',
    tooltip: { text: t('editor.inline_code') }
  }],
  [{
    kind: 'link',
    icon: 'i-lucide-link',
    tooltip: { text: t('editor.link') }
  }],
  [{
    kind: 'codeBlock',
    icon: 'i-lucide-file-code',
    tooltip: { text: t('editor.code_snippet') }
  }],
  [{
    kind: 'heading',
    level: 2,
    icon: 'i-lucide-heading-2',
    label: t('editor.h2')
  }, {
    kind: 'heading',
    level: 3,
    icon: 'i-lucide-heading-3',
    label: t('editor.h3')
  }],
  [{
    kind: 'bulletList',
    icon: 'i-lucide-list',
    tooltip: { text: t('editor.bullet_list') }
  }, {
    kind: 'orderedList',
    icon: 'i-lucide-list-ordered',
    tooltip: { text: t('editor.ordered_list') }
  }, {
    kind: 'blockquote',
    icon: 'i-lucide-text-quote',
    tooltip: { text: t('editor.quote') }
  }, {
    kind: 'codeBlock',
    icon: 'i-lucide-file-code',
    tooltip: { text: t('editor.code_block') }
  }]
])

const suggestionItems = computed<EditorSuggestionMenuItem[][]>(() => [
  [
    { type: 'label', label: t('editor.text') },
    { kind: 'paragraph', label: t('editor.paragraph'), icon: 'i-lucide-type' },
    { kind: 'heading', level: 1, label: t('editor.h1'), icon: 'i-lucide-heading-1' },
    { kind: 'heading', level: 2, label: t('editor.h2'), icon: 'i-lucide-heading-2' },
    { kind: 'heading', level: 3, label: t('editor.h3'), icon: 'i-lucide-heading-3' }
  ],
  [
    { type: 'label', label: t('editor.lists') },
    { kind: 'bulletList', label: t('editor.bullet_list'), icon: 'i-lucide-list' },
    { kind: 'orderedList', label: t('editor.ordered_list'), icon: 'i-lucide-list-ordered' }
  ],
  [
    { type: 'label', label: t('editor.insert') },
    { kind: 'blockquote', label: t('editor.quote'), icon: 'i-lucide-text-quote' },
    { kind: 'codeBlock', label: t('editor.code_block'), icon: 'i-lucide-square-code' },
    { kind: 'horizontalRule', label: t('editor.divider'), icon: 'i-lucide-separator-horizontal' }
  ]
])
</script>

<template>
  <div class="relative w-full group">
    <UEditor
      v-slot="{ editor }"
      v-model="content"
      content-type="json"
      :disabled="readOnly"
      :placeholder="$t('editor.placeholder')"
      class="prose dark:prose-invert max-w-none focus:outline-none min-h-12"
      @focus="emit('focus')"
      @blur="emit('blur')"
    >
      <UEditorToolbar
        :editor="editor"
        :items="bubbleItems"
        layout="bubble"
      />

      <UEditorSuggestionMenu
        :editor="editor"
        :items="suggestionItems"
      />

      <UEditorDragHandle :editor="editor" />
    </UEditor>
  </div>
</template>
