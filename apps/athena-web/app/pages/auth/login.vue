<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import type { LoginRequest } from '@athena/types'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()

const fields: AuthFormField[] = [{
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
}]

const schema: z.ZodType<LoginRequest> = z.object({
  login: z.string(t('pages.auth.login.login-is-required')),
  password: z.string(t('pages.auth.login.password-is-required')).min(4, t('pages.auth.login.password-length'))
})

type Schema = z.output<typeof schema>

function onSubmit(payload: FormSubmitEvent<Schema>) {
  console.log('Submitted', payload.data)
}
</script>

<template>
  <UPageCard class="w-full max-w-md">
    <UAuthForm
      :schema="schema"
      :title="$t('pages.auth.login.header')"
      :description="$t('pages.auth.login.subheader')"
      icon="i-lucide-user"
      :fields="fields"
      @submit="(e: unknown) => onSubmit(e as FormSubmitEvent<LoginRequest>)"
    />
  </UPageCard>
</template>
