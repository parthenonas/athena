<script setup lang="ts">
import { VueDraggable, type SortableEvent } from 'vue-draggable-plus'
import { BlockType, type BlockResponse, type CodeBlockResponse, type TextBlockResponse, type UpdateBlockRequest } from '@athena/types'

const props = defineProps<{
  blocks: BlockResponse[]
  activeBlockId: string | null
  loading?: boolean
  readOnly?: boolean
  executionStates?: Record<string, { isRunning: boolean, output: string }>
}>()

const emit = defineEmits<{
  (e: 'update:blocks', value: BlockResponse[]): void
  (e: 'update:activeBlockId', id: string | null): void
  (e: 'add', type: BlockType): void
  (e: 'update', id: string, payload: UpdateBlockRequest): void
  (e: 'delete', id: string): void
  (e: 'reorder', event: SortableEvent): void
  (e: 'run', blockId: string, code: string): void
}>()

const { t } = useI18n()

const localBlocks = computed({
  get: () => props.blocks,
  set: val => emit('update:blocks', val)
})

const blockTypes = computed(() => [
  { label: t('blocks.type.text'), icon: 'i-lucide-align-left', type: BlockType.Text },
  { label: t('blocks.type.code'), icon: 'i-lucide-code', type: BlockType.Code }
])

const addBlockItems = computed(() => [
  blockTypes.value.map(b => ({
    label: b.label,
    icon: b.icon,
    onSelect: () => emit('add', b.type)
  }))
])

const onBackgroundClick = () => {
  if (props.activeBlockId) {
    emit('update:activeBlockId', null)
  }
}
</script>

<template>
  <div
    class="w-full min-h-full flex flex-col items-center py-6 px-4 cursor-default"
    @click="onBackgroundClick"
  >
    <div class="w-full max-w-3xl flex flex-col flex-1 relative">
      <div
        v-if="loading"
        class="flex justify-center py-10"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin w-8 h-8 text-primary-500"
        />
      </div>

      <div
        v-else-if="blocks.length === 0"
        class="flex flex-col items-center justify-center p-8 text-gray-400 ring-2 ring-dashed ring-gray-200 dark:ring-gray-800 rounded-lg"
        @click="emit('update:activeBlockId', null)"
      >
        <UIcon
          name="i-lucide-blocks"
          class="w-12 h-12 mb-2"
        />
        <p>{{ $t('pages.studio.builder.no-blocks') }}</p>
      </div>

      <VueDraggable
        v-else
        v-model="localBlocks"
        :animation="150"
        handle=".drag-handle"
        class="space-y-2 pb-20"
        :disabled="readOnly"
        @end="(e) => emit('reorder', e)"
      >
        <div
          v-for="block in blocks"
          :key="block.id"
          class="group relative rounded-md transition-all duration-200 px-2 py-1"
          :class="{
            'ring-1 ring-primary-500 bg-white dark:bg-gray-900 z-10 shadow-sm': !readOnly && activeBlockId === block.id,
            'ring-1 ring-transparent hover:ring-gray-300 dark:hover:ring-gray-700': !readOnly && activeBlockId !== block.id,
            'cursor-default': readOnly,
            'cursor-pointer': !readOnly
          }"
          @click.stop="emit('update:activeBlockId', block.id)"
        >
          <div
            v-if="!readOnly"
            class="absolute -left-8 top-1.5 p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab drag-handle flex items-center justify-center"
            :title="$t('common.drag')"
            @click.stop
          >
            <UIcon
              name="i-lucide-grip-vertical"
              class="w-4 h-4"
            />
          </div>

          <div class="cursor-text w-full">
            <StudioBlocksText
              v-if="block.type === BlockType.Text"
              :model-value="(block as TextBlockResponse).content"
              :read-only="readOnly"
              @update:model-value="emit('update', block.id, { ...block, content: $event })"
              @focus="emit('update:activeBlockId', block.id)"
            />

            <StudioBlocksCode
              v-else-if="block.type === BlockType.Code"
              :model-value="(block as CodeBlockResponse).content"
              :read-only="readOnly"
              :is-running="executionStates?.[block.id]?.isRunning"
              :output="executionStates?.[block.id]?.output"
              @update:model-value="emit('update', block.id, { ...block, content: $event })"
              @change="emit('update', block.id, { ...block, content: $event })"
              @focus="emit('update:activeBlockId', block.id)"
              @run="(code) => emit('run', block.id, code)"
            />

            <div
              v-else
              class="text-sm text-gray-500 italic p-4 ring-1 ring-dashed ring-gray-200 dark:ring-gray-800 rounded select-none bg-gray-50/50 dark:bg-gray-800/50"
            >
              <div class="flex items-center gap-2 mb-1">
                <UIcon
                  :name="blockTypes.find(b => b.type === block.type)?.icon"
                  class="w-4 h-4"
                />
                <span class="font-bold text-xs uppercase">{{ block.type }}</span>
              </div>
              {{ $t('pages.studio.builder.block-preview') }}
            </div>
          </div>
        </div>
      </VueDraggable>

      <div
        v-if="!readOnly"
        class="sticky bottom-4 mt-auto flex justify-center z-20 pointer-events-none"
      >
        <div class="pointer-events-auto">
          <UDropdownMenu
            :items="addBlockItems"
            :popper="{ placement: 'top' }"
          >
            <UButton
              icon="i-lucide-plus"
              :label="$t('pages.studio.builder.add-block')"
              color="primary"
              variant="solid"
              size="lg"
              class="shadow-lg rounded-full px-6"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </div>
    </div>
  </div>
</template>
