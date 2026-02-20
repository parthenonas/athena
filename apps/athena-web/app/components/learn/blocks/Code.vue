<script setup lang="ts">
import { ref, watch } from 'vue'
import { BlockRequiredAction, type CodeBlockContent } from '@athena/types'

const props = defineProps<{
  content: CodeBlockContent
  requiredAction: BlockRequiredAction
  isCompleted: boolean
  isRunning?: boolean
  output?: string
}>()

const emit = defineEmits<{
  (e: 'run', code: string): void
  (e: 'submit', payload: { code: string }): void
}>()

const localCode = ref(props.content.initialCode || '')

watch(() => props.content.initialCode, (newVal) => {
  if (!props.isCompleted) {
    localCode.value = newVal || ''
  }
})

const handleRun = () => emit('run', localCode.value)
const handleSubmit = () => emit('submit', { code: localCode.value })
</script>

<template>
  <div class="w-full space-y-4">
    <div
      v-if="content.taskText?.json"
      class="mb-4 text-gray-700 dark:text-gray-300"
    >
      <CommonEditor
        :model-value="content.taskText.json"
        :read-only="true"
      />
    </div>

    <CommonCodeEditor
      v-model="localCode"
      :language="content.language"
      :read-only="isCompleted"
    />

    <div
      v-if="output || isRunning"
      class="p-4 bg-gray-900 text-gray-300 rounded-md font-mono text-sm whitespace-pre-wrap"
    >
      <UIcon
        v-if="isRunning"
        name="i-lucide-loader-2"
        class="w-4 h-4 animate-spin text-primary-500 mb-2"
      />
      {{ output || $t('blocks.code.running') }}
    </div>

    <div class="flex items-center gap-3 mt-2">
      <UButton
        icon="i-lucide-play"
        color="neutral"
        variant="soft"
        :label="$t('blocks.code.run')"
        :loading="isRunning"
        @click="handleRun"
      />
      <UButton
        v-if="requiredAction === BlockRequiredAction.SUBMIT || requiredAction === BlockRequiredAction.PASS"
        icon="i-lucide-send"
        color="primary"
        :label="$t('common.submit')"
        :disabled="isCompleted"
        @click="handleSubmit"
      />
    </div>
  </div>
</template>
