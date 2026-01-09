<script setup lang="ts">
import { FileAccess } from '@athena/types'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/vue-3'

const props = defineProps<NodeViewProps>()

const { uploadFile, deleteFile } = useMedia()

const file = ref<File | null>(null)
const loading = ref(false)

const src = computed(() => props.node.attrs.src)
const fileId = computed(() => props.node.attrs.id)

watch(file, async (newFile) => {
  if (!newFile) return
  loading.value = true
  try {
    const response = await uploadFile(newFile, FileAccess.Public)
    props.updateAttributes({
      src: response.url,
      type: newFile.type,
      id: response.id
    })
  } catch {
    file.value = null
  } finally {
    loading.value = false
  }
})

const removeNode = async () => {
  if (fileId.value) {
    await deleteFile(fileId.value)
  }
  props.deleteNode()
}
</script>

<template>
  <NodeViewWrapper class="relative flex justify-center my-4 group">
    <div
      v-if="src"
      class="relative w-full max-w-2xl group/video"
    >
      <video
        controls
        class="rounded-lg w-full shadow-sm bg-black"
        :class="{ 'ring-2 ring-primary-500': selected }"
      >
        <source
          :src="src"
          :type="node.attrs.type"
        >
        Your browser does not support the video tag.
      </video>

      <UButton
        icon="i-lucide-trash-2"
        color="error"
        variant="solid"
        size="xs"
        class="absolute top-2 right-2 opacity-0 group-hover/video:opacity-100 transition-opacity z-10"
        @click.stop="removeNode"
      />
    </div>

    <div
      v-else
      class="w-full max-w-sm"
    >
      <UFileUpload
        v-model="file"
        accept="video/*"
        :loading="loading"
        :label="$t('editor.upload-video')"
        icon="i-lucide-video"
        class="w-full"
      />
    </div>
  </NodeViewWrapper>
</template>
