<script setup lang="ts">
import { ref, computed } from 'vue'
import { BlockType, BlockRequiredAction, GradingStatus, type SanitizedBlockView, type TextBlockContent, type CodeBlockContent } from '@athena/types'
import { useIntersectionObserver } from '@vueuse/core'

import BlockText from './blocks/Text.vue'
import BlockCode from './blocks/Code.vue'

const props = defineProps<{
  block: SanitizedBlockView
  isRunning?: boolean
  output?: string
}>()

const emit = defineEmits<{
  (e: 'viewed', blockId: string): void
  (e: 'submit', blockId: string, payload: unknown): void
  (e: 'run', blockId: string, code: string): void
}>()

const targetRef = ref<HTMLElement | null>(null)
const isCompleted = computed(() => props.block.progress?.status === GradingStatus.GRADED)

if (props.block.requiredAction === BlockRequiredAction.VIEW && !isCompleted.value) {
  const { stop } = useIntersectionObserver(
    targetRef,
    (entries) => {
      const entry = entries[0]
      if (entry && entry.isIntersecting) {
        emit('viewed', props.block.blockId)
        stop()
      }
    },
    { threshold: 0 }
  )
}

const handleInteract = () => {
  if (!isCompleted.value) emit('viewed', props.block.blockId)
}
</script>

<template>
  <div

    class="w-full py-6 group relative"
  >
    <div
      class="flex items-center gap-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity"
      :class="{ 'opacity-100': block.requiredAction !== BlockRequiredAction.VIEW }"
    >
      <UIcon
        :name="isCompleted ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
        class="w-4 h-4"
        :class="isCompleted ? 'text-success-500' : 'text-gray-300'"
      />
      <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {{ $t(`blocks.type.${block.type}`) }}
      </span>
    </div>

    <BlockText
      v-if="block.type === BlockType.Text"
      :content="block.content as unknown as TextBlockContent"
    />

    <BlockCode
      v-else-if="block.type === BlockType.Code"
      :content="block.content as unknown as CodeBlockContent"
      :required-action="block.requiredAction"
      :is-completed="isCompleted"
      :is-running="isRunning"
      :output="output"
      @run="(code) => emit('run', block.blockId, code)"
      @submit="(payload) => emit('submit', block.blockId, payload)"
    />

    <div
      v-else
      class="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed text-center text-gray-500"
    >
      {{ $t("components.learn.block-renderer.unknown-type", { type: block.type }) }}
    </div>

    <div
      v-if="block.requiredAction === BlockRequiredAction.VIEW"
      ref="targetRef"
      class="h-px w-full opacity-0 pointer-events-none mt-4"
    />

    <div
      v-if="block.requiredAction === BlockRequiredAction.INTERACT"
      class="mt-8 flex justify-center"
    >
      <UButton
        size="lg"
        :color="isCompleted ? 'success' : 'primary'"
        :variant="isCompleted ? 'soft' : 'solid'"
        :icon="isCompleted ? 'i-lucide-check' : 'i-lucide-arrow-down'"
        :label="isCompleted ? $t('common.completed') : $t('pages.learn.continue')"
        :disabled="isCompleted"
        class="w-full sm:w-auto min-w-50"
        @click="handleInteract"
      />
    </div>
  </div>
</template>
