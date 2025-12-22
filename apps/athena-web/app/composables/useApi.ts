import type { UseFetchOptions } from '#app'

export function useApi<T>(
  url: string | (() => string),
  options: UseFetchOptions<T> = {}
) {
  const config = useRuntimeConfig()

  const accessToken = useCookie('athena_access_token')

  const defaults: UseFetchOptions<T> = {
    baseURL: config.public.apiUrl as string,

    key: typeof url === 'function' ? url() : url,

    onRequest({ options }) {
      if (accessToken.value) {
        options.headers.set('Authorization', `Bearer ${accessToken.value}`)
      }
    },

    async onResponseError({ response }) {
      if (response.status === 401) {
        accessToken.value = null

        await navigateTo('/login')
      }
    }
  }

  return useFetch(url, {
    ...defaults,
    ...options
  })
}
