<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import type { LoginRequest } from '@athena/types'

const { t } = useI18n()

const authStore = useAuthStore()
const toast = useToast()

const fields = computed<AuthFormField[]>(() => ([{
  name: 'login',
  type: 'text',
  label: t('pages.auth.login.login-label'),
  placeholder: t('pages.auth.login.login-placeholder'),
  required: true
}, {
  name: 'password',
  type: 'password',
  label: t('pages.auth.login.password-label'),
  placeholder: t('pages.auth.login.password-placeholder'),
  required: true
}]))

const schema: z.ZodType<LoginRequest> = z.object({
  login: z.string(t('pages.auth.login.login-is-required')),
  password: z.string(t('pages.auth.login.password-is-required'))
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, t('pages.auth.login.password-rule'))
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    await authStore.login(payload.data)
    toast.add({
      title: t('pages.auth.login.success-title'),
      description: t('pages.auth.login.success-msg'),
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    await navigateTo('/dashboard')
  } catch (error: unknown) {
    console.error('Login error:', error)

    toast.add({
      title: t('pages.auth.login.error-title'),
      description: t('pages.auth.login.error-msg'),
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
    <UPageCard
      class="w-full max-w-md"
      variant="soft"
    >
      <UAuthForm
        :schema="schema"
        :title="$t('pages.auth.login.header')"
        :description="$t('pages.auth.login.subheader')"
        icon="i-lucide-user"
        :fields="fields"
        @submit="(e: unknown) => onSubmit(e as FormSubmitEvent<LoginRequest>)"
      />
    </UPageCard>
  </div>
</template>
