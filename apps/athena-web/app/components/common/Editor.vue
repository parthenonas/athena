<script setup lang="ts">
import type { EditorCustomHandlers, EditorSuggestionMenuItem, EditorToolbarItem } from '@nuxt/ui'
import { CustomImage, Video } from '~/utils/tiptap/extensions'

const props = defineProps<{
  modelValue?: Record<string, unknown>
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, unknown>): void
  (e: 'change' | 'focus' | 'blur'): void
}>()

const { t } = useI18n()
const EMPTY_DOCUMENT = { type: 'doc', content: [{ type: 'paragraph' }] }

const localContent = ref(props.modelValue || EMPTY_DOCUMENT)

watch(localContent, (val) => {
  emit('update:modelValue', val)
  emit('change')
})

const customHandlers: EditorCustomHandlers = {
  image: {
    canExecute: editor => editor.can().insertContent({ type: 'image' }),
    execute: editor => editor.chain().focus().insertContent({ type: 'image' }).run(),
    isActive: editor => editor.isActive('image')
  },
  video: {
    canExecute: editor => editor.can().insertContent({ type: 'video' }),
    execute: editor => editor.chain().focus().insertContent({ type: 'video' }).run(),
    isActive: editor => editor.isActive('video')
  }
}

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
    tooltip: { text: t('editor.inline-code') }
  }],
  [{
    kind: 'link',
    icon: 'i-lucide-link',
    tooltip: { text: t('editor.link') }
  }],
  [{
    kind: 'codeBlock',
    icon: 'i-lucide-file-code',
    tooltip: { text: t('editor.code-snippet') }
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
    { type: 'label', label: t('editor.media') },
    { kind: 'image', label: t('editor.image'), icon: 'i-lucide-image' },
    { kind: 'video', label: t('editor.video'), icon: 'i-lucide-video' }
  ],
  [
    { type: 'label', label: t('editor.lists') },
    { kind: 'bulletList', label: t('editor.bullet-list'), icon: 'i-lucide-list' },
    { kind: 'orderedList', label: t('editor.ordered-list'), icon: 'i-lucide-list-ordered' }
  ],
  [
    { type: 'label', label: t('editor.insert') },
    { kind: 'blockquote', label: t('editor.quote'), icon: 'i-lucide-text-quote' },
    { kind: 'codeBlock', label: t('editor.code-block'), icon: 'i-lucide-square-code' },
    { kind: 'horizontalRule', label: t('editor.divider'), icon: 'i-lucide-separator-horizontal' }
  ]
])

const editorRef = ref()

const syncEditableState = () => {
  const editor = editorRef.value?.editor
  if (!editor) return

  const shouldBeEditable = !props.readOnly
  if (editor.isEditable !== shouldBeEditable) {
    editor.setEditable(shouldBeEditable)
  }
}

watch(() => props.readOnly, syncEditableState)

watch(() => editorRef.value?.editor, (val) => {
  if (val) {
    nextTick(syncEditableState)
  }
})
</script>

<template>
  <div class="relative w-full group">
    <UEditor
      ref="editorRef"
      v-slot="{ editor }"
      v-model="localContent"
      content-type="json"
      :placeholder="{
        showOnlyWhenEditable: true,
        placeholder: $t('editor.placeholder')
      }"
      :extensions="[CustomImage, Video]"
      :handlers="customHandlers"
      class="prose dark:prose-invert max-w-none focus:outline-none min-h-12"
      :ui="{ content: 'p-0!' }"
      @focus="emit('focus')"
      @blur="emit('blur')"
    >
      <template v-if="!readOnly">
        <UEditorToolbar
          :editor="editor"
          :items="bubbleItems"
          layout="bubble"
        />

        <UEditorSuggestionMenu
          :editor="editor"
          :items="suggestionItems"
        />
      </template>
    </UEditor>
  </div>
</template>
