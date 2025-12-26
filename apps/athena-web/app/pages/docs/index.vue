<script setup lang="ts">
const { locale } = useI18n()

await navigateTo(`/docs/${locale.value}`, { replace: true })
</script>
