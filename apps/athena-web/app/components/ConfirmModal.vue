<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  loading?: boolean
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}>(), {
  danger: false
})

const emit = defineEmits(['update:open', 'confirm'])

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const onConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="description"
    :ui="{ content: 'sm:max-w-sm' }"
  >
    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          :label="cancelLabel || $t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="isOpen = false"
        />
        <UButton
          :label="confirmLabel || $t('common.confirm')"
          :color="danger ? 'error' : 'primary'"
          :loading="loading"
          @click="onConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
