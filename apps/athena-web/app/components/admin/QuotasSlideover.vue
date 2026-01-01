<script setup lang="ts">
import type { FilterRoleRequest, MediaQuotaRequest } from '@athena/types'
import type { SelectMenuItem, TableColumn } from '@nuxt/ui'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const { fetchRoles } = useRoles()
const { fetchQuotas, setQuota, deleteQuota } = useMedia()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const editState = reactive<Record<string, number>>({})
const loadingState = reactive<Record<string, boolean>>({})

const isAdding = ref(false)
const newRuleRole = ref<string | null>(null)
const newRuleLimit = ref<number>(100)

const roleSearchTerm = ref('')

const filters = reactive<FilterRoleRequest>({
  page: 1,
  limit: 20,
  search: undefined,
  sortBy: 'name',
  sortOrder: 'ASC'
})

watchDebounced(roleSearchTerm, (val) => {
  filters.search = val
}, { debounce: 500, maxWait: 1000 })

const { data: fetchedRoles, pending: rolesLoading } = await fetchRoles(filters)
const { data: quotas, pending: quotasLoading, refresh: refreshQuotas } = await fetchQuotas()

const roles = computed<SelectMenuItem[]>(() => (fetchedRoles.value?.data || []).map(role => ({
  id: role.id,
  label: role.name
})))

watch(quotas, (newValue) => {
  (newValue || []).forEach((q) => {
    const bytes = typeof q.limitBytes === 'string' ? parseInt(q.limitBytes, 10) : q.limitBytes
    editState[q.roleName] = Math.round(bytes / 1024 / 1024)
  })
}, { immediate: true })

const columns = computed<TableColumn<MediaQuotaRequest>[]>(() => [
  { accessorKey: 'roleName', header: t('components.admin.quotas.role') },
  { accessorKey: 'limitBytes', header: t('components.admin.quotas.limit') },
  { id: 'actions', header: '' }
])

const saveRule = async (roleName: string, mb: number) => {
  if (mb < 0) return

  loadingState[roleName] = true
  try {
    const bytes = mb * 1024 * 1024
    await setQuota(roleName, bytes)
    await refreshQuotas()

    if (isAdding.value && newRuleRole.value === roleName) {
      isAdding.value = false
      newRuleRole.value = null
      newRuleLimit.value = 100
    }
  } finally {
    loadingState[roleName] = false
  }
}

const removeRule = async (roleName: string) => {
  loadingState[roleName] = true
  try {
    await deleteQuota(roleName)
    await refreshQuotas()
  } finally {
    loadingState[roleName] = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="$t('components.admin.quotas.title')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="space-y-6">
        <UAlert
          icon="i-lucide-info"
          color="primary"
          variant="subtle"
          :title="$t('components.admin.quotas.info-title')"
          :description="$t('components.admin.quotas.info-desc')"
        />

        <div class="flex justify-between items-center">
          <h3 class="font-bold text-gray-900 dark:text-white">
            {{ $t('components.admin.quotas.active-rules') }}
          </h3>
          <UButton
            v-if="!isAdding"
            size="sm"
            color="primary"
            variant="soft"
            icon="i-lucide-plus"
            :label="$t('components.admin.quotas.add-rule')"
            @click="isAdding = true"
          />
        </div>

        <UCard
          v-if="isAdding"
        >
          <div class="grid grid-cols-[1fr_120px] gap-4">
            <UFormField :label="$t('components.admin.quotas.select-role')">
              <USelectMenu
                v-model:search-term="roleSearchTerm"
                v-model="newRuleRole"
                :items="roles"
                :loading="rolesLoading"
                value-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('components.admin.quotas.limit-mb')">
              <UInput
                v-model="newRuleLimit"
                type="number"
                :min="0"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :label="$t('common.cancel')"
                @click="isAdding = false"
              />
              <UButton
                color="primary"
                size="sm"
                :label="$t('common.save')"
                :disabled="!newRuleRole"
                :loading="!!(newRuleRole && loadingState[newRuleRole])"
                @click="newRuleRole && saveRule(newRuleRole, newRuleLimit)"
              />
            </div>
          </template>
        </UCard>

        <UTable
          :data="quotas"
          :columns="columns"
          :loading="quotasLoading"
        >
          <template #roleName-cell="{ row }">
            <span class="font-medium font-display">{{ row.original.roleName }}</span>
          </template>

          <template #limitBytes-cell="{ row }">
            <div class="flex items-center gap-2">
              <UInput
                v-model="editState[row.original.roleName]"
                type="number"
                class="w-24"
                :min="0"
              >
                <template #trailing>
                  <span class="text-gray-400 text-[10px]">MB</span>
                </template>
              </UInput>

              <UTooltip :text="$t('common.save')">
                <UButton
                  color="primary"
                  variant="ghost"
                  icon="i-lucide-save"
                  :loading="loadingState[row.original.roleName]"
                  @click="saveRule(row.original.roleName, editState[row.original.roleName]!)"
                />
              </UTooltip>
            </div>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <UTooltip :text="$t('components.admin.quotas.reset-tooltip')">
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash"
                  :loading="loadingState[row.original.roleName]"
                  @click="removeRule(row.original.roleName)"
                />
              </UTooltip>
            </div>
          </template>
        </UTable>

        <div
          v-if="!quotasLoading && Array.isArray(quotas) && quotas.length === 0 && !isAdding"
          class="text-center py-8 text-gray-500"
        >
          <UIcon
            name="i-lucide-list-checks"
            class="w-8 h-8 mx-auto mb-2 opacity-50"
          />
          <p>{{ $t('components.admin.quotas.no-rules') }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          :label="$t('common.cancel')"
          color="secondary"
          variant="ghost"
          @click="isOpen = false"
        />
      </div>
    </template>
  </USlideover>
</template>
