<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import { Permission, type CreateRoleRequest, type UpdateRoleRequest } from '@athena/types'
import { z } from 'zod'

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

const schema = z.object({
  name: z.string()
    .min(1, t('components.admin.roles-slideover.errors.name-required'))
    .min(3, t('components.admin.roles-slideover.errors.name-min')),
  permissions: z.array(z.string())
})

type Schema = z.output<typeof schema>

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const permissionGroups = computed(() => {
  const groups: Record<string, Permission[]> = {}

  if (!Permission) {
    console.error('Permission Enum is missing!')
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

watchEffect(async () => {
  if (!isOpen.value) return

  isLoading.value = true
  try {
    if (props.roleId) {
      const role = await fetchRole(props.roleId)
      if (role) {
        state.name = role.name
        state.permissions = role.permissions || []
        state.policies = role.policies
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

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isLoading.value = true
  try {
    if (props.roleId) {
      await updateRole(props.roleId, event.data as UpdateRoleRequest)
    } else {
      await createRole(event.data as CreateRoleRequest)
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

const selectPermission = (selected: boolean, perm: Permission) => {
  if (!state.permissions) state.permissions = []

  if (selected) {
    if (!state.permissions.includes(perm)) state.permissions.push(perm)
  } else {
    state.permissions = state.permissions.filter(p => p !== perm)
  }
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="roleId ? $t('pages.roles.edit') : $t('pages.roles.create')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="roles-form"
        :schema="schema"
        :state="state"
        class="h-full flex flex-col gap-6"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('components.admin.roles-slideover.name-label')"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            class="w-full"
            autofocus
          />
        </UFormField>

        <USeparator :label="$t('components.admin.roles-slideover.permissions-title')" />

        <div class="space-y-6 pb-4">
          <div
            v-for="(perms, group) in permissionGroups"
            :key="group"
            class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg"
          >
            <div class="text-xs font-bold text-gray-500 uppercase mb-2">
              {{ group }}
            </div>

            <div class="grid grid-cols-1 gap-3">
              <UCheckbox
                v-for="perm in perms"
                :key="perm"
                :model-value="state.permissions?.includes(perm)"
                :label="getPermissionLabel(perm)"
                @update:model-value="selectPermission($event as boolean, perm)"
              />
            </div>
          </div>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton
          :label="$t('common.cancel')"
          color="secondary"
          variant="ghost"
          @click="isOpen = false"
        />
        <UButton
          type="submit"
          form="roles-form"
          :label="$t('common.save')"
          color="primary"
          :loading="isLoading"
        />
      </div>
    </template>
  </USlideover>
</template>
