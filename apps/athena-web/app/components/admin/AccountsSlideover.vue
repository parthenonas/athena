<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import { z } from 'zod'
import type {
  CreateAccountRequest,
  UpdateAccountRequest,
  FilterRoleRequest,
  RoleResponse,
  CreateProfileRequest,
  UpdateProfileRequest
} from '@athena/types'
import type { SelectMenuItem } from '@nuxt/ui'
import { PASSWORD_REGEX, MIN_NAME_LENGTH, MAX_NAME_LENGTH } from '@athena/common'

const props = defineProps<{
  modelValue: boolean
  accountId?: string | null
}>()

const emit = defineEmits(['update:modelValue', 'refresh'])

const { t } = useI18n()
const { fetchAccount, createAccount, updateAccount } = useAccounts()
const { fetchRoles, fetchRole } = useRoles()
const { fetchProfile, createProfile, updateProfile } = useProfiles()

const isLoading = ref(false)
const search = ref('')
const specificRole = ref<RoleResponse | null>(null)
const hasProfile = ref(false)

const state = reactive({
  login: '',
  password: '',
  roleId: undefined as string | undefined,
  firstName: '',
  lastName: '',
  patronymic: '',
  // eslint-disable-next-line
  birthDate: undefined as any,
})

const items = computed(() => [
  {
    label: t('components.admin.accounts-slideover.tab-account'),
    icon: 'i-lucide-user',
    slot: 'account'
  },
  {
    label: t('components.admin.accounts-slideover.tab-profile'),
    icon: 'i-lucide-contact',
    slot: 'profile'
  }
])

const schema = computed(() => {
  const baseSchema = z.object({
    login: z.string()
      .min(3, t('components.admin.accounts-slideover.errors.login-min')),
    roleId: z.string(t('components.admin.accounts-slideover.errors.role-required')),
    firstName: z.string()
      .min(MIN_NAME_LENGTH, t('components.admin.accounts-slideover.errors.firstname-min', { length: MIN_NAME_LENGTH }))
      .max(MAX_NAME_LENGTH, t('components.admin.accounts-slideover.errors.firstname-max', { length: MAX_NAME_LENGTH }))
      .optional(),
    lastName: z.string()
      .min(MIN_NAME_LENGTH, t('components.admin.accounts-slideover.errors.lastname-min', { length: MIN_NAME_LENGTH }))
      .max(MAX_NAME_LENGTH, t('components.admin.accounts-slideover.errors.lastname-max', { length: MAX_NAME_LENGTH }))
      .optional(),
    patronymic: z.string()
      .min(MIN_NAME_LENGTH, t('components.admin.accounts-slideover.errors.patronymic-min', { length: MIN_NAME_LENGTH }))
      .max(MAX_NAME_LENGTH, t('components.admin.accounts-slideover.errors.patronymic-max', { length: MAX_NAME_LENGTH }))
      .optional()
  })

  if (!props.accountId) {
    return baseSchema.extend({
      password: z.string()
        .regex(PASSWORD_REGEX, t('components.admin.accounts-slideover.errors.password-rule'))
    })
  }

  return baseSchema.extend({
    password: z.string()
      .regex(PASSWORD_REGEX, t('components.admin.accounts-slideover.errors.password-rule'))
      .or(z.literal(''))
      .optional()
  })
})

type Schema = z.output<typeof schema.value>

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const filters = reactive<FilterRoleRequest>({
  page: 1,
  limit: 20,
  search: undefined,
  sortBy: 'name',
  sortOrder: 'ASC'
})

watchDebounced(search, (val) => {
  filters.search = val
}, { debounce: 500, maxWait: 1000 })

const { data: fetchedRoles, pending } = await fetchRoles(filters)

const roles = computed<SelectMenuItem[]>(() => {
  const list = fetchedRoles.value?.data || []
  const result = [...list]

  if (specificRole.value && !list.find(r => r.id === specificRole.value?.id)) {
    result.push(specificRole.value)
  }

  return result.map(role => ({
    id: role.id,
    label: role.name
  }))
})

watch(isOpen, async (val) => {
  if (!val) return

  isLoading.value = true
  hasProfile.value = false
  try {
    if (props.accountId) {
      const account = await fetchAccount(props.accountId)
      if (account) {
        state.login = account.login
        state.password = ''
        state.roleId = account.roleId

        const currentRoles = fetchedRoles.value?.data || []
        const roleExists = currentRoles.some(r => r.id === account?.roleId)
        if (account.roleId && !roleExists) {
          try {
            const roleData = await fetchRole(account.roleId)
            specificRole.value = roleData
          } catch (e) {
            console.error('Failed to load specific role', e)
          }
        }
      }

      const profile = await fetchProfile(props.accountId)
      if (profile) {
        hasProfile.value = true
        state.firstName = profile.firstName
        state.lastName = profile.lastName
        state.patronymic = profile.patronymic || ''
        state.birthDate = toCalendarDate(profile.birthDate)
      } else {
        hasProfile.value = false
        state.firstName = ''
        state.lastName = ''
        state.patronymic = ''
        state.birthDate = null
      }
    } else {
      state.login = ''
      state.password = ''
      state.roleId = undefined
      state.firstName = ''
      state.lastName = ''
      state.patronymic = ''
      state.birthDate = null
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}, { immediate: true })

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isLoading.value = true
  try {
    const formData = event.data

    if (props.accountId) {
      const accPayload: UpdateAccountRequest = {
        login: formData.login,
        roleId: state.roleId
      }
      if (formData.password) {
        accPayload.password = formData.password
      }
      await updateAccount(props.accountId, accPayload)

      const profPayload: UpdateProfileRequest = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        patronymic: formData.patronymic,
        birthDate: toNativeDate(state.birthDate)
      }

      if (hasProfile.value) {
        await updateProfile(props.accountId, profPayload)
      } else {
        await createProfile(props.accountId, profPayload as CreateProfileRequest)
        hasProfile.value = true
      }
    } else {
      const accPayload: CreateAccountRequest = {
        login: formData.login,
        password: formData.password!,
        roleId: state.roleId
      }
      const newAccount = await createAccount(accPayload)

      if (newAccount && newAccount.id) {
        const profPayload: CreateProfileRequest = {
          firstName: formData.firstName!,
          lastName: formData.lastName!,
          patronymic: formData.patronymic!,
          birthDate: toNativeDate(state.birthDate)
        }
        await createProfile(newAccount.id, profPayload)
      }
    }

    emit('refresh')
    isOpen.value = false
  } catch (e: unknown) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="accountId ? $t('pages.accounts.edit') : $t('pages.accounts.create')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="accounts-form"
        :schema="schema"
        :state="state"
        class="h-full flex flex-col"
        @submit="onSubmit"
      >
        <UTabs
          :items="items"
          class="w-full"
        >
          <template #account>
            <div class="flex flex-col gap-6 pt-4">
              <UFormField
                :label="$t('components.admin.accounts-slideover.login-label')"
                name="login"
                required
              >
                <UInput
                  v-model="state.login"
                  autofocus
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('components.admin.accounts-slideover.password-label')"
                name="password"
                :required="!accountId"
                :help="accountId ? $t('components.admin.accounts-slideover.password-help') : undefined"
              >
                <UInput
                  v-model="state.password"
                  type="password"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('components.admin.accounts-slideover.role-label')"
                name="roleId"
              >
                <USelectMenu
                  v-model:search-term="search"
                  v-model="state.roleId"
                  :items="roles"
                  :loading="pending"
                  value-key="id"
                  class="w-full"
                />
              </UFormField>
            </div>
          </template>

          <template #profile>
            <div class="flex flex-col gap-6 pt-4">
              <div class="grid grid-cols-2 gap-4">
                <UFormField
                  :label="$t('components.admin.accounts-slideover.lastname-label')"
                  name="lastName"
                  required
                >
                  <UInput
                    v-model="state.lastName"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  :label="$t('components.admin.accounts-slideover.firstname-label')"
                  name="firstName"
                  required
                >
                  <UInput
                    v-model="state.firstName"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField
                :label="$t('components.admin.accounts-slideover.patronymic-label')"
                name="patronymic"
              >
                <UInput
                  v-model="state.patronymic"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('components.admin.accounts-slideover.birthdate-label')"
                name="birthDate"
              >
                <UInputDate
                  v-model="state.birthDate"
                  class="w-full"
                  granularity="minute"
                />
              </UFormField>
            </div>
          </template>
        </UTabs>
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
          form="accounts-form"
          :label="$t('common.save')"
          color="primary"
          :loading="isLoading"
        />
      </div>
    </template>
  </USlideover>
</template>
