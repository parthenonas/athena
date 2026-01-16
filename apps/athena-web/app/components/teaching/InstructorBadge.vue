<script setup lang="ts">
const props = defineProps<{
  instructorId: string
}>()

const { fetchInstructor } = useTeaching()

const { data: instructor, status } = await useAsyncData(
  `instructor-${props.instructorId}`,
  async () => {
    return await fetchInstructor(props.instructorId)
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

  <span v-else-if="status === 'error' || !instructor">
    {{ instructorId }}
  </span>

  <UButton
    v-else
    variant="link"
    :to="{ path: '/teaching/instructors', query: { instructorId: instructor.id } }"
    :padded="false"
  >
    {{ instructor.title }}
  </UButton>
</template>
