<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import { Permission, Policy, type CreateRoleRequest, type UpdateRoleRequest } from '@athena/types'
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
  permissions: z.array(z.string()),
  policies: z.record(z.string(), z.array(z.string())).optional()
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

const policyOptions = computed(() => {
  if (!Policy) return []
  return Object.values(Policy).map(p => ({
    label: t(`policies.${p}`),
    value: p
  }))
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
    const cleanPolicies: Record<string, Policy[]> = {}
    if (state.policies) {
      Object.entries(state.policies).forEach(([perm, pols]) => {
        if (state.permissions?.includes(perm as Permission) && pols && pols.length > 0) {
          cleanPolicies[perm] = pols
        }
      })
    }
    const payload = {
      ...event.data,
      policies: cleanPolicies
    } as CreateRoleRequest | UpdateRoleRequest

    if (props.roleId) {
      await updateRole(props.roleId, payload as UpdateRoleRequest)
    } else {
      await createRole(payload as CreateRoleRequest)
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
    if (!state.policies) state.policies = {}
    if (!state.policies[perm]) state.policies[perm] = []
  } else {
    state.permissions = state.permissions.filter(p => p !== perm)
    if (state.policies && state.policies[perm]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete state.policies[perm]
    }
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
              <div
                v-for="perm in perms"
                :key="perm"
                class="flex items-center justify-between p-1 rounded-md "
              >
                <UCheckbox
                  :model-value="state.permissions?.includes(perm)"
                  :label="getPermissionLabel(perm)"
                  @update:model-value="selectPermission($event as boolean, perm)"
                />
                <div
                  v-if="state.permissions?.includes(perm)"
                  class="w-1/2"
                >
                  <USelectMenu
                    v-model="state.policies![perm]"
                    :items="policyOptions"
                    multiple
                    value-key="value"
                    label-key="label"
                    :placeholder="$t('components.admin.roles-slideover.add-policy')"
                    size="xs"
                    variant="subtle"
                    color="secondary"
                    class="w-full"
                    :ui="{ leading: 'ps-2' }"
                  />
                </div>
              </div>
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
