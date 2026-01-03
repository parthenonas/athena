<script setup lang="ts">
import { ProgrammingLanguage, CodeExecutionMode, type CodeBlockContent } from '@athena/types'

defineProps<{
  content: CodeBlockContent
}>()

const emit = defineEmits<{
  (e: 'update', key: keyof CodeBlockContent, value: unknown): void
}>()

const languageOptions = [
  { label: 'Python', value: ProgrammingLanguage.Python },
  { label: 'SQL', value: ProgrammingLanguage.SQL }
]

const executionModeOptions = [
  { label: 'I/O Check', value: CodeExecutionMode.IoCheck },
  { label: 'Unit Test', value: CodeExecutionMode.UnitTest }
]
</script>

<template>
  <div class="space-y-4">
    <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {{ $t('pages.studio.builder.inspector.blocks.code.settings') }}
    </span>

    <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.language')">
      <USelectMenu
        :model-value="content.language"
        :options="languageOptions"
        value-attribute="value"
        option-attribute="label"
        @update:model-value="val => emit('update', 'language', val)"
      />
    </UFormField>

    <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.execution-mode')">
      <USelectMenu
        :model-value="content.executionMode"
        :options="executionModeOptions"
        value-attribute="value"
        option-attribute="label"
        @update:model-value="val => emit('update', 'executionMode', val)"
      />
    </UFormField>

    <div class="grid grid-cols-2 gap-2">
      <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.time-limit')">
        <UInput
          type="number"
          :model-value="content.timeLimit"
          placeholder="1000"
          @update:model-value="val => emit('update', 'timeLimit', Number(val))"
        />
      </UFormField>
      <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.memory-limit')">
        <UInput
          type="number"
          :model-value="content.memoryLimit"
          placeholder="128"
          @update:model-value="val => emit('update', 'memoryLimit', Number(val))"
        />
      </UFormField>
    </div>
  </div>
</template>
