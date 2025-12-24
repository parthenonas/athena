<script setup lang="ts">
const props = defineProps<{
  title: string
  loading?: boolean
  open: boolean
}>()

const emit = defineEmits(['update:open', 'submit', 'cancel'])

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const onSubmit = () => {
  emit('submit')
}

const onCancel = () => {
  emit('update:open', false)
  emit('cancel')
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="title"
    :ui="{
      content: 'sm:max-w-xl'
    }"
  >
    <template #body>
      <form
        id="slideover-form"
        class="h-full"
        @submit.prevent="onSubmit"
      >
        <slot />
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="outline"
          @click="onCancel"
        />
        <UButton
          type="submit"
          form="slideover-form"
          :label="$t('common.save')"
          color="primary"
          :loading="loading"
        />
      </div>
    </template>
  </USlideover>
</template>
