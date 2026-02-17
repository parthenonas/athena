<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { PASSWORD_REGEX, MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '@athena/common'
import { FileAccess } from '@athena/types'

definePageMeta({
  layout: 'dashboard'
})

const { t } = useI18n()
const { fetchAccount, changePassword } = useAccounts()
const { fetchMe, updateMe, createMe } = useProfiles()
const { uploadFile } = useMedia()

const { data: me, status: accountStatus } = await useAsyncData('me', () => fetchAccount('me'))
const { data: profile, status: profileStatus, refresh } = await useAsyncData('profile-me', () => fetchMe())

const isProfileLoading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const profileState = reactive({
  firstName: '',
  lastName: '',
  patronymic: '',
  avatarUrl: ''
})

watch(profile, (newVal) => {
  if (newVal) {
    profileState.firstName = newVal.firstName
    profileState.lastName = newVal.lastName
    profileState.patronymic = newVal.patronymic || ''
    profileState.avatarUrl = newVal.avatarUrl || ''
  }
}, { immediate: true })

const profileSchema = z.object({
  firstName: z.string().min(MIN_NAME_LENGTH).max(MAX_NAME_LENGTH),
  lastName: z.string().min(MIN_NAME_LENGTH).max(MAX_NAME_LENGTH),
  patronymic: z.string().max(MAX_NAME_LENGTH).optional(),
  avatarUrl: z.string().optional()
})

type ProfileSchema = z.output<typeof profileSchema>

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

const triggerFileInput = () => {
  fileInput.value?.click()
}

const onFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return

  const file = target.files[0]
  isProfileLoading.value = true

  try {
    const uploaded = await uploadFile(file!, FileAccess.Public)

    profileState.avatarUrl = uploaded.url

    if (profile.value) {
      await updateMe({ avatarUrl: uploaded.url })
    }
  } finally {
    isProfileLoading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const onRemoveAvatar = async () => {
  isProfileLoading.value = true
  try {
    await updateMe({ avatarUrl: null })

    profileState.avatarUrl = ''
  } finally {
    isProfileLoading.value = false
  }
}

const onProfileSubmit = async (event: FormSubmitEvent<ProfileSchema>) => {
  isProfileLoading.value = true
  try {
    if (profile.value) {
      await updateMe(event.data)
    } else {
      await createMe(event.data)
      await refresh()
    }
  } finally {
    isProfileLoading.value = false
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
        v-if="accountStatus === 'pending'"
        class="flex items-center gap-4 animate-pulse"
      >
        <div class="space-y-2">
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-4 w-24" />
        </div>
      </div>

      <div
        v-else-if="me"
        class="flex items-start md:items-center gap-6"
      >
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
          <UIcon name="i-lucide-user" />
          <h3 class="font-display font-semibold">
            {{ $t('pages.settings.profile-title') || 'Personal Information' }}
          </h3>
        </div>
      </template>

      <div
        v-if="profileStatus === 'pending'"
        class="space-y-4 animate-pulse"
      >
        <div class="flex items-center gap-4">
          <USkeleton class="h-20 w-20 rounded-full" />
          <div class="space-y-2 flex-1">
            <USkeleton class="h-8 w-1/3" />
            <USkeleton class="h-4 w-1/4" />
          </div>
        </div>
      </div>

      <div
        v-else
        class="flex flex-col md:flex-row gap-8"
      >
        <div class="flex flex-col items-center gap-4">
          <div class="relative group">
            <UAvatar
              :src="profileState.avatarUrl"
              :alt="profileState.firstName"
              size="3xl"
              class="ring-4 ring-white dark:ring-gray-900"
            />

            <div
              class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <button
                type="button"
                class="text-white hover:text-primary-400 transition-colors"
                :title="$t('pages.settings.upload-avatar')"
                :disabled="isProfileLoading"
                @click="triggerFileInput"
              >
                <UIcon
                  name="i-lucide-camera"
                  class="w-6 h-6"
                />
              </button>

              <button
                v-if="profileState.avatarUrl"
                type="button"
                class="text-white hover:text-error-400 transition-colors"
                :title="$t('pages.settings.remove-avatar')"
                :disabled="isProfileLoading"
                @click="onRemoveAvatar"
              >
                <UIcon
                  name="i-lucide-trash-2"
                  class="w-6 h-6"
                />
              </button>
            </div>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onFileSelect"
          >
        </div>

        <UForm
          :schema="profileSchema"
          :state="profileState"
          class="flex-1 space-y-4"
          @submit="onProfileSubmit"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField
              :label="$t('pages.settings.first-name')"
              name="firstName"
              required
            >
              <UInput
                v-model="profileState.firstName"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="$t('pages.settings.last-name')"
              name="lastName"
              required
            >
              <UInput
                v-model="profileState.lastName"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="$t('pages.settings.patronymic')"
              name="patronymic"
            >
              <UInput
                v-model="profileState.patronymic"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="flex justify-end pt-2">
            <UButton
              type="submit"
              :label="$t('pages.settings.save-profile-btn')"
              color="primary"
              :loading="isProfileLoading"
            />
          </div>
        </UForm>
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
        class="flex-1 space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField
            :label="$t('pages.settings.old-password')"
            name="oldPassword"
            required
          >
            <UInput
              v-model="state.oldPassword"
              class="w-full"
              type="password"
              autocomplete="current-password"
            />
          </UFormField>
          <div />

          <UFormField

            :label="$t('pages.settings.new-password')"
            name="newPassword"
            required
          >
            <UInput
              v-model="state.newPassword"
              class="w-full"
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
              class="w-full"
              type="password"
              autocomplete="new-password"
            />
          </UFormField>
        </div>

        <div class="flex justify-end pt-2">
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
