<script setup lang="ts">
import { Permission, type CreateRoleRequest } from '@athena/types'

const props = defineProps<{
  modelValue: boolean
  roleId?: string | null
}>()

const emit = defineEmits(['update:modelValue', 'refresh'])

const { t } = useI18n()
const { fetchRole, createRole, updateRole } = useRoles()

const isLoading = ref(false)
const state = reactive<CreateRoleRequest>({
  name: '',
  permissions: [],
  policies: {}
})

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const permissionGroups = computed(() => {
  const groups: Record<string, Permission[]> = {}

  if (!Permission) {
    console.error('Permission Enum is missing! Check @athena/types import.')
    return {}
  }

  Object.values(Permission).forEach((perm) => {
    const [group] = perm.split('.')
    const key = (group === perm ? 'system' : group) || 'other'

    if (!groups[key]) groups[key] = []
    groups[key].push(perm)
  })
  return groups
})

watch(isOpen, async (val) => {
  if (!val) return

  isLoading.value = true
  try {
    if (props.roleId) {
      const { data } = await fetchRole(props.roleId)
      if (data.value) {
        state.name = data.value.name
        state.permissions = [...(data.value.permissions || [])]
        state.policies = data.value.policies
      }
    } else {
      state.name = ''
      state.permissions = []
      state.policies = {}
    }
  } finally {
    isLoading.value = false
  }
})

const onSubmit = async () => {
  isLoading.value = true
  try {
    const payload = {
      ...state,
      permissions: state.permissions || []
    }
    if (props.roleId) {
      await updateRole(props.roleId, payload)
    } else {
      await createRole(state)
    }
    emit('refresh')
    isOpen.value = false
  } catch (e: unknown) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const getPermissionLabel = (perm: string) => {
  const parts = perm.split('.')
  const action = parts.length > 1 ? parts[1] : perm
  return t(`permissions.actions.${action}`)
}
</script>

<template>
  <SlideoverForm
    v-model:open="isOpen"
    :title="roleId ? $t('pages.roles.edit') : $t('pages.roles.create')"
    :loading="isLoading"
    @submit="onSubmit"
  >
    <div class="space-y-6">
      <UFormGroup
        :label="$t('pages.roles.name')"
        required
      >
        <UInput
          v-model="state.name"
          placeholder="e.g. Content Manager"
          autofocus
        />
      </UFormGroup>

      <USeparator :label="$t('pages.roles.title')" />

      <div class="space-y-6">
        <div
          v-for="(perms, group) in permissionGroups"
          :key="group"
          class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg"
        >
          <div class="grid grid-cols-1 gap-3">
            <UCheckbox
              v-for="perm in perms"
              :key="perm"
              v-model="state.permissions"
              :value="perm"
              :label="getPermissionLabel(perm)"
            />
          </div>
        </div>
      </div>
    </div>
  </SlideoverForm>
</template>
