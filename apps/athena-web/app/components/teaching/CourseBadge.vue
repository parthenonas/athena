<script setup lang="ts">
const props = defineProps<{
  courseId: string
}>()

const { fetchCourse } = useStudio()

const { data: course, status } = await useAsyncData(
  `course-${props.courseId}`,
  async () => {
    return await fetchCourse(props.courseId)
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

  <span v-else-if="status === 'error' || !course">
    {{ courseId }}
  </span>

  <UButton
    v-else
    variant="link"
    :to="`/studio/courses/${courseId}`"
    :padded="false"
  >
    {{ course.title }}
  </UButton>
</template>
