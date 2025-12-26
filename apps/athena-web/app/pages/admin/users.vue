<script setup lang="ts">
import { type AccountResponse, Status } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchAccounts, deleteAccount } = useAccounts()

const isSlideoverOpen = ref(false)
const selectedAccountId = ref<string | null>(null)

const isDeleteOpen = ref(false)
const deleteLoading = ref(false)
const accountToDelete = ref<AccountResponse | null>(null)

const columns = computed<TableColumn<AccountResponse>[]>(() => [
  { accessorKey: 'id', header: t('pages.accounts.columns.id') },
  { accessorKey: 'login', header: t('pages.accounts.columns.login') },
  { accessorKey: 'status', header: t('pages.accounts.columns.status') },
  { accessorKey: 'roleId', header: t('pages.accounts.columns.role-id') },
  { accessorKey: 'createdAt', header: t('pages.accounts.columns.created-at') },
  { accessorKey: 'updatedAt', header: t('pages.accounts.columns.updated-at') },
  { id: 'actions', header: '' }
])

const search = ref('')

const filters = reactive({
  page: 1,
  limit: 10,
  search: '',
  sortBy: 'createdAt' as const,
  sortOrder: 'DESC' as const
})

const { data, status, refresh } = await fetchAccounts(filters)

watchDebounced(search, (val) => {
  filters.search = val
}, { debounce: 500, maxWait: 1000 })

const accounts = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)
const loading = computed(() => status.value === 'pending')

const openCreate = () => {
  selectedAccountId.value = null
  isSlideoverOpen.value = true
}

const openEdit = (account: AccountResponse) => {
  selectedAccountId.value = account.id
  isSlideoverOpen.value = true
}

const openDelete = (account: AccountResponse) => {
  accountToDelete.value = account
  isDeleteOpen.value = true
}

const onConfirmDelete = async () => {
  if (!accountToDelete.value) return

  deleteLoading.value = true
  try {
    await deleteAccount(accountToDelete.value.id)
    await refresh()
    isDeleteOpen.value = false
    accountToDelete.value = null
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {{ $t('pages.accounts.title') }}
        </h1>
        <p class="text-gray-500">
          {{ $t('pages.accounts.description') }}
        </p>
      </div>
      <UButton
        variant="ghost"
        icon="i-lucide-plus"
        :label="$t('pages.accounts.create')"
        @click="openCreate"
      />
    </div>

    <div class="flex gap-4">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="$t('pages.accounts.search-placeholder')"
        class="w-full max-w-sm"
      />
    </div>

    <UTable
      :data="accounts"
      :columns="columns"
      :loading="loading"
    >
      <template #roleId-cell="{ row }">
        <AdminRoleBadge :role-id="row.original.roleId" />
      </template>

      <template #status-cell="{ row }">
        <div class="flex gap-2">
          <UBadge
            v-if="row.original.status === Status.Active"
            color="primary"
            variant="subtle"
            :label="$t('statuses.active')"
          />
          <UBadge
            v-else-if="row.original.status === Status.TemporaryBlocked"
            color="warning"
            variant="subtle"
            :label="$t('statuses.temporary-blocked')"
          />
          <UBadge
            v-else-if="row.original.status === Status.Blocked"
            color="error"
            variant="subtle"
            :label="$t('statuses.blocked')"
          />
          <UBadge
            v-else
            color="secondary"
            variant="subtle"
            :label="$t('statuses.unknown')"
          />
        </div>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-gray-500 text-sm">
          {{ new Date(row.original.createdAt).toLocaleDateString() }}
        </span>
      </template>

      <template #updatedAt-cell="{ row }">
        <span class="text-gray-500 text-sm">
          {{ new Date(row.original.updatedAt).toLocaleDateString() }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UButton
            color="secondary"
            variant="ghost"
            icon="i-lucide-edit-2"
            size="xs"
            @click="openEdit(row.original)"
          />
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash"
            size="xs"
            @click="openDelete(row.original)"
          />
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

    <AdminAccountsSlideover
      v-model="isSlideoverOpen"
      :account-id="selectedAccountId"
      @refresh="refresh"
    />

    <ConfirmModal
      v-model:open="isDeleteOpen"
      :title="$t('pages.accounts.delete-modal.title')"
      :description="$t('pages.accounts.delete-modal.description')"
      :confirm-label="$t('common.delete')"
      danger
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
