<script setup lang="ts">
import { withLeadingSlash, joinURL } from 'ufo'

const route = useRoute()
const { locale } = useI18n()

definePageMeta({
  layout: 'docs'
})

const slug = computed(() => {
  const params = route.params.slug
  return withLeadingSlash(Array.isArray(params) ? params.join('/') : (params || ''))
})

const targetPath = computed(() => {
  if (slug.value === '/') return '/docs'

  return joinURL('/docs', slug.value)
})

const collectionName = computed(() => `docs_${locale.value}` as 'docs_ru' | 'docs_en')

const { data: navigation } = await useAsyncData(`nav-${locale.value}`, () => {
  return queryCollectionNavigation(collectionName.value)
}, {
  watch: [locale]
})

const { data: page } = await useAsyncData(`page-${locale.value}-${slug.value}`, async () => {
  const content = await queryCollection(collectionName.value).path(targetPath.value).first()
  if (!content && locale.value !== 'en') {
    return await queryCollection('docs_en').path(targetPath.value).first()
  }

  return content
}, {
  watch: [locale]
})

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

useSeoMeta({
  title: page.value?.title,
  description: page.value?.description
})

const { data: surround } = await useAsyncData(`surround-${locale.value}-${slug.value}`, () => {
  return queryCollectionItemSurroundings(collectionName.value, targetPath.value, {
    before: 1,
    after: 1
  })
}, {
  watch: [locale]
})
</script>

<template>
  <UPage
    v-if="page"
    :key="locale + slug"
  >
    <template #left>
      <UPageAside>
        <UContentNavigation :navigation="navigation" />
      </UPageAside>
    </template>

    <UPageBody>
      <ContentRenderer :value="page" />

      <USeparator class="my-6" />

      <UContentSurround :surround="(surround as any)" />
    </UPageBody>

    <template #right>
      <UContentToc
        v-if="page.body?.toc"
        :links="page.body.toc.links"
      />
    </template>
  </UPage>
</template>
