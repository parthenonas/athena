<script setup lang="ts">
const props = defineProps<{
  accountId: string
}>()

const { fetchAccount } = useAccounts()

const { data: account, status } = await useAsyncData(
  `account-${props.accountId}`,
  async () => {
    return await fetchAccount(props.accountId)
  },
  {
    lazy: true,
    server: false,
    dedupe: 'defer'
  }
)
</script>

<template>
  <USkeleton
    v-if="status === 'pending'"
    class="h-5 w-24 bg-gray-200 dark:bg-gray-800"
  />

  <span v-else-if="status === 'error' || !account">
    {{ accountId }}
  </span>

  <UButton
    v-else
    variant="link"
    :to="{ path: '/admin/users', query: { accountId: account.id } }"
    :padded="false"
  >
    {{ account.login }}
  </UButton>
</template>
