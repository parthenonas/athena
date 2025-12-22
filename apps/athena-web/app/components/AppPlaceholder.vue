<script setup lang="ts">
defineProps({
  title: {
    type: String,
    default: 'Work in Progress'
  },
  description: {
    type: String,
    default: 'This feature is currently under active development. Stay tuned for updates.'
  },
  icon: {
    type: String,
    default: 'i-lucide-hammer'
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 min-h-100 p-8 text-center animate-fade-in">
    <div class="relative mb-6 group">
      <div class="absolute inset-0 bg-primary-500/20 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

      <div class="relative flex items-center justify-center w-20 h-20 rounded-full bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 shadow-lg">
        <UIcon
          :name="icon"
          class="w-10 h-10 text-primary-500 group-hover:scale-110 transition-transform duration-300"
        />
      </div>
    </div>

    <h3 class="text-2xl font-display font-bold text-gray-900 dark:text-white mb-2">
      {{ title }}
    </h3>
    <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 font-body leading-relaxed">
      {{ description }}
    </p>

    <div class="flex gap-4">
      <UButton
        label="Go Back"
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
        @click="$router.back()"
      />
      <UButton
        label="Dashboard"
        variant="soft"
        color="primary"
        icon="i-lucide-layout-dashboard"
        to="/dashboard"
      />
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
