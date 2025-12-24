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

const columns = computed<TableColumn<RoleResponse>[]>(() => [
  { accessorKey: 'name', header: t('pages.roles.columns.name') },
  { accessorKey: 'permissions', header: t('pages.roles.columns.access_level') },
  { accessorKey: 'updatedAt', header: t('pages.roles.columns.updated_at') },
  { id: 'actions', header: '' }
])

const filters = reactive({
  page: 1,
  limit: 10,
  search: '',
  sortBy: 'createdAt' as const,
  sortOrder: 'DESC' as const
})

const { data, status, refresh } = await fetchRoles(filters)

const roles = computed(() => data.value?.data || [])
const total = computed(() => data.value?.meta?.total || 0)
const loading = computed(() => status.value === 'pending')

const openCreate = () => {
  selectedRoleId.value = null
  isSlideoverOpen.value = true
}

const openEdit = (role: RoleResponse) => {
  selectedRoleId.value = role.id
  isSlideoverOpen.value = true
}

const onDelete = async (role: RoleResponse) => {
  if (!confirm(t('pages.roles.delete_confirm'))) return
  await deleteRole(role.id)
  refresh()
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
        v-model="filters.search"
        icon="i-lucide-search"
        :placeholder="$t('pages.roles.search_placeholder')"
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
            :label="$t('pages.roles.super_admin')"
          />
          <UBadge
            v-else
            color="primary"
            variant="subtle"
            :label="$t('pages.roles.permissions_count', { count: row.original.permissions.length })"
          />
        </div>
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
            @click="onDelete(row.original)"
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

    <RolesSlideover
      v-model="isSlideoverOpen"
      :role-id="selectedRoleId"
      @refresh="refresh"
    />
  </div>
</template>
