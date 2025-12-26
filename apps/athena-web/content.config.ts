import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    docs_en: defineCollection({
      type: 'page',
      source: {
        include: 'docs/en/**/*.md',
        prefix: '/docs'
      },
      schema: z.object({
        title: z.string(),
        description: z.string().optional()
      })
    }),
    docs_ru: defineCollection({
      type: 'page',
      source: {
        include: 'docs/ru/**/*.md',
        prefix: '/docs'
      },
      schema: z.object({
        title: z.string(),
        description: z.string().optional()
      })
    })
  }
})
