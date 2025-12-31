<script setup lang="ts">
import { FileAccess } from '@athena/types'

const props = defineProps<{
  modelValue: boolean
  allowAccessControl?: boolean
  defaultAccess?: FileAccess
  title?: string
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const { uploadFile } = useMedia()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const file = ref<File | null>(null)
const isUploading = ref(false)

const isPublic = ref(props.defaultAccess === FileAccess.Public)

watch(isOpen, (val) => {
  if (val) {
    file.value = null
    isUploading.value = false
    isPublic.value = props.defaultAccess === FileAccess.Public
  }
})

const accessLabel = computed(() =>
  isPublic.value
    ? t('components.common.file-uploader.access.public')
    : t('components.common.file-uploader.access.private')
)

const accessDescription = computed(() =>
  isPublic.value
    ? t('components.common.file-uploader.access.public-desc')
    : t('components.common.file-uploader.access.private-desc')
)

const onSubmit = async () => {
  if (!file.value) return

  isUploading.value = true
  try {
    const accessLevel = isPublic.value ? FileAccess.Public : FileAccess.Private
    await uploadFile(file.value, accessLevel)

    emit('success')
    isOpen.value = false
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title || $t('components.common.file-uploader.title')"
    :description="$t('components.common.file-uploader.description')"
  >
    <template #body>
      <div class="space-y-6">
        <UFormField
          :label="$t('components.common.file-uploader.file-label')"
        >
          <UFileUpload
            v-model="file"
            :label="$t('components.common.file-uploader.drop-label')"
            :description="$t('components.common.file-uploader.drop-desc')"
            icon="i-lucide-upload-cloud"
            class="min-h-32"
          />
        </UFormField>

        <USwitch
          v-model="isPublic"
          size="lg"
          :label="accessLabel"
          :description="accessDescription"
          checked-icon="i-lucide-globe"
          unchecked-icon="i-lucide-lock"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="$t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="isOpen = false"
        />
        <UButton
          :label="$t('common.upload')"
          color="primary"
          :loading="isUploading"
          :disabled="!file"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
