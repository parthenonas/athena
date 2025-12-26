<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'docs'
})

const { data: navigation } = await useAsyncData('docs-navigation', () => {
  return queryCollectionNavigation('docs')
})

const { data: page } = await useAsyncData(route.path, () => {
  return queryCollection('docs').path(route.path).first()
})

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

useSeoMeta({
  title: page.value?.title,
  description: page.value?.description
})

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings('docs', route.path, {
    before: 1,
    after: 1
  })
})
</script>

<template>
  <UPage v-if="page">
    <template #left>
      <UPageAside>
        <UContentNavigation :navigation="navigation" />
      </UPageAside>
    </template>

    <UPageBody>
      <ContentRenderer :value="page" />

      <USeparator />

      <UContentSurround :surround="surround" />
    </UPageBody>

    <template #right>
      <UContentToc
        v-if="page.body?.toc"
        :links="page.body.toc.links"
      />
    </template>
  </UPage>
</template>
