<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { PASSWORD_REGEX } from '@athena/common'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchAccount, changePassword } = useAccounts()

const { data: me, status } = await useAsyncData('me', () => fetchAccount('me'))

const isLoading = ref(false)

const state = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const schema = computed(() => z.object({
  oldPassword: z.string()
    .min(1, t('pages.settings.errors.old-password-required')),
  newPassword: z.string()
    .min(8, t('components.admin.accounts-slideover.errors.password-min'))
    .regex(PASSWORD_REGEX, t('components.admin.accounts-slideover.errors.password-rule')),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: t('pages.settings.errors.passwords-mismatch'),
  path: ['confirmPassword']
}))

type Schema = z.output<typeof schema.value>

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isLoading.value = true
  try {
    await changePassword({
      oldPassword: event.data.oldPassword,
      newPassword: event.data.newPassword
    })

    state.oldPassword = ''
    state.newPassword = ''
    state.confirmPassword = ''
  } finally {
    isLoading.value = false
  }
}

const { formatDate } = useAppDate()
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-display font-bold text-gray-900 dark:text-white">
        {{ $t('pages.settings.title') }}
      </h1>
      <p class="text-gray-500">
        {{ $t('pages.settings.description') }}
      </p>
    </div>

    <UCard>
      <div
        v-if="status === 'pending'"
        class="flex items-center gap-4 animate-pulse"
      >
        <USkeleton class="h-20 w-20 rounded-full" />
        <div class="space-y-2">
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-4 w-24" />
        </div>
      </div>

      <div
        v-else-if="me"
        class="flex items-start md:items-center gap-6"
      >
        <UAvatar
          :alt="me.login"
          size="3xl"
          class="font-display uppercase"
        />

        <div class="flex-1 space-y-1">
          <div class="flex items-center gap-3 flex-wrap">
            <h2 class="text-xl font-bold font-display">
              {{ me.login }}
            </h2>
            <AdminRoleBadge :role-id="me.roleId" />
          </div>

          <div class="text-sm text-gray-500 ">
            ID: {{ me.id }}
          </div>

          <div class="text-sm pt-1 flex items-center gap-1">
            <UIcon
              name="i-lucide-calendar"
              class="w-4 h-4 text-gray-500"
            />
            <span class="text-gray-500 ">{{ $t('pages.settings.member-since', { date: formatDate(me.createdAt) }) }}</span>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-lock"
          />
          <h3 class="font-display font-semibold">
            {{ $t('pages.settings.security-title') }}
          </h3>
        </div>
      </template>

      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4 max-w-lg"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('pages.settings.old-password')"
          name="oldPassword"
          required
        >
          <UInput
            v-model="state.oldPassword"
            type="password"
            autocomplete="current-password"
          />
        </UFormField>

        <USeparator class="my-2" />

        <UFormField
          :label="$t('pages.settings.new-password')"
          name="newPassword"
          required
        >
          <UInput
            v-model="state.newPassword"
            type="password"
            autocomplete="new-password"
          />
        </UFormField>

        <UFormField
          :label="$t('pages.settings.confirm-password')"
          name="confirmPassword"
          required
        >
          <UInput
            v-model="state.confirmPassword"
            type="password"
            autocomplete="new-password"
          />
        </UFormField>

        <div class="pt-2">
          <UButton
            type="submit"
            :label="$t('pages.settings.change-password-btn')"
            :loading="isLoading"
            color="primary"
          />
        </div>
      </UForm>
    </UCard>
  </div>
</template>
