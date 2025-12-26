<script setup lang="ts">
const props = defineProps<{
  roleId: string
}>()

const { fetchRole } = useRoles()

const { data: role, status } = await useAsyncData(
  `role-${props.roleId}`,
  async () => {
    return await fetchRole(props.roleId)
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

  <span v-else-if="status === 'error' || !role">
    {{ roleId }}
  </span>

  <UButton
    v-else
    variant="link"
    :to="{ path: '/admin/roles', query: { roleId: role.id } }"
    :padded="false"
  >
    {{ role.name }}
  </UButton>
</template>
