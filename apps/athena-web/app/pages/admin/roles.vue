<script setup lang="ts">
import { Permission, type RoleResponse } from '@athena/types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchRoles, deleteRole } = useRoles()

const isSlideoverOpen = ref(false)
const selectedRoleId = ref<string | null>(null)

const isDeleteOpen = ref(false)
const deleteLoading = ref(false)
const roleToDelete = ref<RoleResponse | null>(null)

const columns = computed<TableColumn<RoleResponse>[]>(() => [
  { accessorKey: 'id', header: t('pages.roles.columns.id') },
  { accessorKey: 'name', header: t('pages.roles.columns.name') },
  { accessorKey: 'permissions', header: t('pages.roles.columns.access-level') },
  { accessorKey: 'createdAt', header: t('pages.roles.columns.created-at') },
  { accessorKey: 'updatedAt', header: t('pages.roles.columns.updated-at') },
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

watchDebounced(search, (val) => {
  filters.search = val
}, { debounce: 500, maxWait: 1000 })

const { data, status, refresh } = await fetchRoles(filters)
const route = useRoute()
const router = useRouter()

const roles = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)
const loading = computed(() => status.value === 'pending')

const openCreate = () => {
  selectedRoleId.value = null
  isSlideoverOpen.value = true
}

const openEdit = (role: RoleResponse | string) => {
  const id = typeof role === 'string' ? role : role.id
  selectedRoleId.value = id
  isSlideoverOpen.value = true
  router.push({ query: { ...route.query, roleId: id } })
}

const openDelete = (role: RoleResponse) => {
  roleToDelete.value = role
  isDeleteOpen.value = true
}

watch(() => route.query.roleId, (newId) => {
  if (newId && typeof newId === 'string') {
    selectedRoleId.value = newId
    isSlideoverOpen.value = true
  } else {
    isSlideoverOpen.value = false
    selectedRoleId.value = null
  }
}, { immediate: true })

watch(isSlideoverOpen, (isOpen) => {
  if (!isOpen && route.query.roleId) {
    const query = { ...route.query }
    delete query.roleId
    router.replace({ query })
  }
})

const onConfirmDelete = async () => {
  if (!roleToDelete.value) return

  deleteLoading.value = true
  try {
    await deleteRole(roleToDelete.value.id)
    await refresh()
    isDeleteOpen.value = false
    roleToDelete.value = null
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
          {{ $t('pages.roles.title') }}
        </h1>
        <p class="text-gray-500">
          {{ $t('pages.roles.description') }}
        </p>
      </div>
      <UButton
        variant="ghost"
        icon="i-lucide-plus"
        :label="$t('pages.roles.create')"
        @click="openCreate"
      />
    </div>

    <div class="flex gap-4">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="$t('pages.roles.search-placeholder')"
        class="w-full max-w-sm"
      />
    </div>

    <UTable
      :data="roles"
      :columns="columns"
      :loading="loading"
    >
      <template #permissions-cell="{ row }">
        <div class="flex gap-2">
          <UBadge
            v-if="row.original.permissions.includes(Permission.ADMIN)"
            color="error"
            variant="subtle"
            :label="$t('pages.roles.super-admin')"
          />
          <UBadge
            v-else
            color="primary"
            variant="subtle"
            :label="$t('pages.roles.permissions-count', { count: row.original.permissions.length })"
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

    <AdminRolesSlideover
      v-model="isSlideoverOpen"
      :role-id="selectedRoleId"
      @refresh="refresh"
    />

    <ConfirmModal
      v-model:open="isDeleteOpen"
      :title="$t('pages.roles.delete-modal.title')"
      :description="$t('pages.roles.delete-modal.description')"
      :confirm-label="$t('common.delete')"
      danger
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
    />
  </div>
</template>
