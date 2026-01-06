<script setup lang="ts">
import { CodeExecutionMode, type CodeBlockContent } from '@athena/types'

const props = defineProps<{
  modelValue: CodeBlockContent
  readOnly?: boolean
  isRunning?: boolean
  output?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CodeBlockContent): void
  (e: 'focus' | 'blur'): void
  (e: 'run', code: string): void
}>()

const { t } = useI18n()
const activeTab = ref(0)

const taskText = computed({
  get: () => props.modelValue.taskText?.json || {},
  set: (val) => {
    updateField('taskText', {
      ...(props.modelValue.taskText || {}),
      json: val
    })
  }
})

const localSolutionCode = ref(props.modelValue.initialCode || '')
watch(() => props.modelValue.initialCode, (val) => {
  if (!props.readOnly) localSolutionCode.value = val || ''
})

const solutionCode = computed({
  get: () => props.readOnly ? localSolutionCode.value : (props.modelValue.initialCode || ''),
  set: (val) => {
    if (props.readOnly) {
      localSolutionCode.value = val
    } else {
      updateField('initialCode', val)
    }
  }
})

const testCode = computed({
  get: () => props.modelValue.testCasesCode || '',
  set: val => updateField('testCasesCode', val)
})

const setupCode = computed({
  get: () => props.modelValue.inputData || '',
  set: val => updateField('inputData', val)
})

const updateField = (key: keyof CodeBlockContent, value: unknown) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const items = computed(() => {
  const tabs = [{
    label: t('blocks.code.tabs.solution'),
    icon: 'i-lucide-code-2',
    value: 0
  }]
  if (!props.readOnly && props.modelValue.executionMode === CodeExecutionMode.UnitTest) {
    tabs.push({
      label: t('blocks.code.tabs.tests'),
      icon: 'i-lucide-flask-conical',
      value: 1
    })
    tabs.push({
      label: t('blocks.code.tabs.setup'),
      icon: 'i-lucide-settings-2',
      value: 2
    })
  }
  return tabs
})

const handleRun = () => {
  emit('run', solutionCode.value)
}

watch(() => props.modelValue.executionMode, (newMode) => {
  if (newMode !== CodeExecutionMode.UnitTest && activeTab.value > 0) {
    activeTab.value = 0
  }
})
</script>

<template>
  <div
    class="flex flex-col gap-4"
    @click="emit('focus')"
  >
    <div>
      <div class="text-xs font-bold text-gray-400 uppercase mb-2">
        {{ $t('blocks.code.task-description') }}
      </div>
      <CommonEditor
        v-model="taskText"
        :read-only="readOnly"
        class="min-h-20"
      />
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 py-1">
          <UBadge
            color="primary"
            variant="subtle"
            class="uppercase font-mono"
          >
            {{ modelValue.language }}
          </UBadge>
          <UButton
            icon="i-lucide-play"
            size="xs"
            color="success"
            :loading="isRunning"
            @click="handleRun"
          />
        </div>

        <UTabs
          v-if="items.length > 1"
          v-model="activeTab"
          :content="false"
          size="xs"
          :items="items"
        />
      </div>

      <div class="relative">
        <div v-show="activeTab === 0">
          <CommonCodeEditor
            v-model="solutionCode"
            :language="modelValue.language"
            :read-only="false"
            @focus="emit('focus')"
          />
        </div>
        <div
          v-if="!readOnly && modelValue.executionMode === CodeExecutionMode.UnitTest"
          v-show="activeTab === 1"
          class="space-y-2"
        >
          <UAlert
            icon="i-lucide-message-square-warning"
            color="warning"
            variant="subtle"
            size="xs"
            :description="$t('blocks.code.tests-hint')"
          />
          <CommonCodeEditor
            v-model="testCode"
            :language="modelValue.language"
            min-height="200px"
            @focus="emit('focus')"
          />
        </div>

        <div
          v-if="!readOnly && modelValue.executionMode === CodeExecutionMode.UnitTest"
          v-show="activeTab === 2"
          class="space-y-2"
        >
          <UAlert
            icon="i-lucide-info"
            color="info"
            variant="subtle"
            size="xs"
            :description="$t('blocks.code.setup-hint')"
          />
          <CommonCodeEditor
            v-model="setupCode"
            :language="modelValue.language"
            min-height="200px"
            @focus="emit('focus')"
          />
        </div>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-gray-400 uppercase mb-2">
          {{ $t('blocks.code.console.title') }}
        </span>
        <UIcon
          v-if="isRunning"
          name="i-lucide-loader-2"
          class="w-3 h-3 animate-spin text-gray-400"
        />
      </div>

      <div class="p-3 min-h-20 max-h-50 overflow-y-auto whitespace-pre-wrap">
        <template v-if="output">
          {{ output }}
        </template>
        <span
          v-else
          class="text-gray-600 italic"
        >
          {{ isRunning ? $t('blocks.code.running') : $t('blocks.code.console.empty') }}
        </span>
      </div>
    </div>
  </div>
</template>
