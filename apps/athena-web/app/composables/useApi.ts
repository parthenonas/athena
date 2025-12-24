import type { UseFetchOptions } from '#app'
import { defu } from 'defu'

function useApiOptions() {
  const config = useRuntimeConfig()
  const accessToken = useCookie('athena_access_token')

  return {
    baseURL: config.public.apiUrl as string,
    // eslint-disable-next-line
    onRequest({ options }: any) {
      if (accessToken.value) {
        options.headers = options.headers || {}
        if (options.headers instanceof Headers) {
          options.headers.set('Authorization', `Bearer ${accessToken.value}`)
        } else {
          options.headers['Authorization'] = `Bearer ${accessToken.value}`
        }
      }
    },
    // eslint-disable-next-line
    async onResponseError({ response }: any) {
      if (response.status === 401) {
        accessToken.value = null
        await navigateTo('/auth/login')
      }
    }
  }
}

export function useApi<T>(url: string | (() => string), options: UseFetchOptions<T> = {}) {
  const defaults = useApiOptions()

  const key = typeof url === 'function' ? url() : url

  return useFetch(url, defu(options, { ...defaults, key }))
}
// eslint-disable-next-line
export function $api<T>(url: string, options: any = {}) {
  const defaults = useApiOptions()

  return $fetch<T>(url, defu(options, defaults))
}
