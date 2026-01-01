<script setup lang="ts">
import { FileAccess, type FileResponse } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchFiles, deleteFile, downloadFile, formatBytes } = useMedia()
const config = useRuntimeConfig()

const search = ref('')
const filters = reactive({
  page: 1,
  limit: 10,
  search: '',
  sortBy: 'createdAt' as const,
  sortOrder: 'DESC' as const
})

const isUploadModalOpen = ref(false)

const isQuotasOpen = ref(false)

watchDebounced(search, (val) => {
  filters.search = val
  filters.page = 1
}, { debounce: 500, maxWait: 1000 })

const { data, status, refresh } = await fetchFiles(filters)

const files = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)
const loading = computed(() => status.value === 'pending')

const columns = computed<TableColumn<FileResponse>[]>(() => [
  { accessorKey: 'originalName', header: t('pages.media.columns.name', 'Name'), class: 'w-[40%]' },
  { accessorKey: 'access', header: 'Access' },
  { accessorKey: 'mimeType', header: t('pages.media.columns.type', 'Type') },
  { accessorKey: 'size', header: t('pages.media.columns.size', 'Size') },
  { accessorKey: 'createdAt', header: t('pages.media.columns.created', 'Uploaded') },
  { id: 'actions', header: '' }
])

const isDeleteOpen = ref(false)
const deleteLoading = ref(false)
const fileToDelete = ref<FileResponse | null>(null)

const openDelete = (file: FileResponse) => {
  fileToDelete.value = file
  isDeleteOpen.value = true
}

const onConfirmDelete = async () => {
  if (!fileToDelete.value) return
  deleteLoading.value = true
  try {
    await deleteFile(fileToDelete.value.id)
    await refresh()
    isDeleteOpen.value = false
  } finally {
    deleteLoading.value = false
    fileToDelete.value = null
  }
}

const copyUrl = (file: FileResponse) => {
  let urlToCopy = ''

  if (file.access === FileAccess.Public) {
    urlToCopy = file.url
  } else {
    urlToCopy = `${config.public.apiUrl.replace('/api', '')}${file.url}`
  }

  navigator.clipboard.writeText(urlToCopy)
}

const handleDownload = (file: FileResponse) => {
  downloadFile(file)
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {{ $t('pages.media.title') }}
        </h1>
        <p class="text-gray-500">
          {{ $t('pages.media.description') }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-database"
          :label="$t('pages.media.manage-quotas')"
          @click="isQuotasOpen = true"
        />

        <UButton
          variant="solid"
          color="primary"
          icon="i-lucide-upload-cloud"
          :label="$t('pages.media.upload')"
          @click="isUploadModalOpen = true"
        />
      </div>
    </div>

    <div class="flex gap-4">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="$t('pages.media.search')"
        class="w-full max-w-sm"
      />
    </div>

    <UTable
      :data="files"
      :columns="columns"
      :loading="loading"
    >
      <template #originalName-cell="{ row }">
        <div
          class="flex items-center gap-3 group cursor-pointer"
          @click="handleDownload(row.original)"
        >
          <UIcon
            v-if="row.original.mimeType.startsWith('image/')"
            name="i-lucide-image"
            class="w-5 h-5 text-blue-500"
          />
          <UIcon
            v-else-if="row.original.mimeType === 'application/pdf'"
            name="i-lucide-file-text"
            class="w-5 h-5 text-red-500"
          />
          <UIcon
            v-else
            name="i-lucide-file"
            class="w-5 h-5 text-gray-500"
          />
          <div class="flex flex-col">
            <span class="font-medium text-gray-900 dark:text-white truncate max-w-50 group-hover:text-primary-500 group-hover:underline">
              {{ row.original.originalName }}
            </span>
          </div>
        </div>
      </template>

      <template #access-cell="{ row }">
        <UBadge
          :color="row.original.access === 'public' ? 'success' : 'secondary'"
          variant="subtle"
          class="capitalize"
        >
          <UIcon
            :name="row.original.access === 'public' ? 'i-lucide-globe' : 'i-lucide-lock'"
            class="w-3 h-3 mr-1"
          />
          {{ row.original.access }}
        </UBadge>
      </template>

      <template #size-cell="{ row }">
        <span class="text-sm text-gray-500 ">
          {{ formatBytes(row.original.size) }}
        </span>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-gray-500 text-sm">
          {{ new Date(row.original.createdAt).toLocaleDateString() }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UTooltip
            v-if="row.original.access === 'public'"
            :text="$t('common.copy')"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-link"
              size="xs"
              @click="copyUrl(row.original)"
            />
          </UTooltip>

          <UTooltip :text="$t('common.download')">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-download"
              size="xs"
              @click="handleDownload(row.original)"
            />
          </UTooltip>

          <UTooltip
            :text="$t('common.delete')"
            :popper="{ placement: 'top' }"
          >
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash"
              size="xs"
              @click="openDelete(row.original)"
            />
          </UTooltip>
        </div>
      </template>
    </UTable>

    <div class="flex justify-end pt-4">
      <UPagination
        v-model="filters.page"
        :total="total"
        :page-count="filters.limit"
      />
    </div>

    <CommonFileUploaderModal
      v-model="isUploadModalOpen"
      allow-access-control
      :default-access="FileAccess.Public"
      @success="refresh"
    />

    <ConfirmModal
      v-model:open="isDeleteOpen"
      :title="$t('pages.media.delete-modal.title')"
      :description="$t('pages.media.delete-modal.description')"
      :confirm-label="$t('common.delete')"
      danger
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />

    <AdminQuotasSlideover v-model="isQuotasOpen" />
  </div>
</template>
