<script setup lang="ts">
import { ProgrammingLanguage, CodeExecutionMode, type CodeBlockContent } from '@athena/types'

const props = defineProps<{
  content: CodeBlockContent
}>()

const emit = defineEmits<{
  (e: 'update', payload: string | Partial<CodeBlockContent>, value?: unknown): void
}>()

const { t } = useI18n()

const ioInputCache = ref('')
const setupScriptCache = ref('')

onMounted(() => {
  if (props.content.executionMode === CodeExecutionMode.IoCheck) {
    ioInputCache.value = props.content.inputData || ''
  } else {
    setupScriptCache.value = props.content.inputData || ''
  }
})

const onExecutionModeChange = (newMode: CodeExecutionMode) => {
  const currentVal = props.content.inputData || ''
  if (props.content.executionMode === CodeExecutionMode.IoCheck) {
    ioInputCache.value = currentVal
  } else {
    setupScriptCache.value = currentVal
  }

  const newVal = newMode === CodeExecutionMode.IoCheck
    ? ioInputCache.value
    : setupScriptCache.value

  emit('update', {
    executionMode: newMode,
    inputData: newVal
  })
}

const languageOptions = [
  { label: 'Python', value: ProgrammingLanguage.Python },
  { label: 'SQL', value: ProgrammingLanguage.SQL }
]

const executionModeOptions = [
  { label: t('pages.studio.builder.inspector.blocks.code.mode-io'), value: CodeExecutionMode.IoCheck },
  { label: t('pages.studio.builder.inspector.blocks.code.mode-unit'), value: CodeExecutionMode.UnitTest }
]
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-3">
      <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {{ $t('pages.studio.builder.inspector.blocks.code.environment') }}
      </span>

      <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.language')">
        <USelectMenu
          :model-value="content.language"
          :items="languageOptions"
          value-key="value"
          class="w-full"
          @update:model-value="val => emit('update', 'language', val)"
        />
      </UFormField>

      <div class="grid grid-cols-2 gap-2">
        <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.time-limit')">
          <UInput
            type="number"
            :model-value="content.timeLimit"
            placeholder="1000"
            icon="i-lucide-timer"
            @update:model-value="val => emit('update', 'timeLimit', Number(val))"
          />
        </UFormField>
        <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.memory-limit')">
          <UInput
            type="number"
            :model-value="content.memoryLimit"
            placeholder="128"
            icon="i-lucide-cpu"
            @update:model-value="val => emit('update', 'memoryLimit', Number(val))"
          />
        </UFormField>
      </div>
    </section>

    <USeparator />

    <section class="space-y-4">
      <div class="flex flex-col gap-3">
        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {{ $t('pages.studio.builder.inspector.blocks.code.validation') }}
        </span>
        <USelectMenu
          :model-value="content.executionMode"
          :items="executionModeOptions"
          value-key="value"
          class="w-full"
          @update:model-value="(val) => onExecutionModeChange(val as CodeExecutionMode)"
        />
      </div>

      <div
        v-if="content.executionMode === CodeExecutionMode.IoCheck"
        class="space-y-3"
      >
        <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.input-stdin')">
          <UTextarea
            :model-value="content.inputData"
            :rows="3"
            class="font-mono text-xs"
            placeholder="1 2 3..."
            @update:model-value="val => emit('update', 'inputData', val)"
          />
        </UFormField>
        <UFormField :label="$t('pages.studio.builder.inspector.blocks.code.output-stdout')">
          <UTextarea
            :model-value="content.outputData"
            :rows="3"
            class="font-mono text-xs"
            placeholder="6..."
            @update:model-value="val => emit('update', 'outputData', val)"
          />
        </UFormField>
        <UAlert
          icon="i-lucide-info"
          color="neutral"
          variant="subtle"
          size="xs"
          class="text-xs"
          :description="$t('pages.studio.builder.inspector.blocks.code.io-hint')"
        />
      </div>

      <div
        v-else
        class="space-y-2"
      >
        <UAlert
          icon="i-lucide-flask-conical"
          color="primary"
          variant="subtle"
          :title="$t('pages.studio.builder.inspector.blocks.code.unit-test-title')"
          :description="$t('pages.studio.builder.inspector.blocks.code.unit-test-desc')"
        />
      </div>
    </section>
  </div>
</template>
