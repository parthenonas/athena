<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { CreateInstructorRequest, UpdateInstructorRequest, AccountResponse, FilterAccountRequest } from '@athena/types'
import type { SelectMenuItem } from '@nuxt/ui'

const props = defineProps<{
  modelValue: boolean
  instructorId?: string | null
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const { createInstructor, updateInstructor, fetchInstructor } = useTeaching()
const { fetchAccounts, fetchAccount } = useAccounts()

const search = ref('')

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isLoading = ref(false)

const schema = z.object({
  ownerId: z.uuid(),
  title: z.string().min(2, t('validation.min-length', { min: 2 })),
  bio: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  ownerId: '',
  title: '',
  bio: ''
})

const filters = reactive<FilterAccountRequest>({
  page: 1,
  limit: 20,
  search: undefined,
  sortBy: 'login',
  sortOrder: 'ASC'
})

watchDebounced(search, (val) => {
  filters.search = val
}, { debounce: 500, maxWait: 1000 })

const specificAccount = ref<AccountResponse | null>(null)

const { data: fetchedAccounts, pending } = await fetchAccounts(filters)

const accounts = computed<SelectMenuItem[]>(() => {
  const list = fetchedAccounts.value?.data || []
  const result = [...list]

  if (specificAccount.value && !list.find(r => r.id === specificAccount.value?.id)) {
    result.push(specificAccount.value)
  }

  return result.map(account => ({
    id: account.id,
    label: account.login
  }))
})
watch(isOpen, async (val) => {
  if (!val) return

  isLoading.value = true
  try {
    if (props.instructorId) {
      const instructor = await fetchInstructor(props.instructorId)
      if (instructor) {
        state.ownerId = instructor.ownerId
        state.title = instructor.title
        state.bio = instructor.bio || undefined

        const currentAccounts = fetchedAccounts.value?.data || []
        const accountExists = currentAccounts.some(a => a.id === instructor?.ownerId)
        if (instructor.ownerId && !accountExists) {
          try {
            const accountData = await fetchAccount(instructor.ownerId)
            specificAccount.value = accountData
          } catch (e) {
            console.error('Failed to load specific account', e)
          }
        }
      }
    } else {
      state.ownerId = ''
      state.title = ''
      state.bio = ''
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

    if (props.instructorId) {
      const payload: UpdateInstructorRequest = {
        title: formData.title,
        bio: formData.bio
      }
      await updateInstructor(props.instructorId, payload)
    } else {
      const payload: CreateInstructorRequest = {
        ownerId: formData.ownerId,
        title: formData.title,
        bio: formData.bio
      }
      await createInstructor(payload)
    }

    emit('success')
    isOpen.value = false
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="instructorId ? $t('pages.teaching.instructors.edit-title') : $t('pages.teaching.instructors.create-title')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="instructor-form"
        :schema="schema"
        :state="state"
        class="h-full flex flex-col gap-6"
        @submit="onSubmit"
      >
        <UFormField
          :label="$t('pages.teaching.instructors.user-label')"
          name="ownerId"
          required
        >
          <USelectMenu
            v-model:search-term="search"
            v-model="state.ownerId"
            :items="accounts"
            :loading="pending"
            value-key="id"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('pages.teaching.instructors.title-label')"
          name="title"
          required
        >
          <UInput
            v-model="state.title"
            class="w-full"
            placeholder="e.g. Senior Professor"
          />
        </UFormField>

        <UFormField
          :label="$t('pages.teaching.instructors.bio-label')"
          name="bio"
        >
          <UTextarea
            v-model="state.bio"
            :rows="4"
            class="w-full"
            placeholder="..."
          />
        </UFormField>

        <div class="flex justify-end gap-3 pt-4">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="isOpen = false"
          />
          <UButton
            type="submit"
            :label="$t('common.save')"
            color="primary"
            :loading="isLoading"
          />
        </div>
      </UForm>
    </template>
  </USlideover>
</template>
