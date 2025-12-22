import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAuthStore } from '../auth.store'

const { useApiMock } = vi.hoisted(() => {
  return {
    useApiMock: vi.fn()
  }
})

mockNuxtImport('useApi', () => {
  return useApiMock
})

const cookieRef = ref<string | null>(null)
mockNuxtImport('useCookie', () => {
  return () => cookieRef
})

mockNuxtImport('navigateTo', () => {
  return vi.fn()
})

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    cookieRef.value = null
  })

  it('isLogged should be false by default', () => {
    const store = useAuthStore()
    expect(store.isLogged).toBe(false)
  })

  it('login() should save token on success', async () => {
    const store = useAuthStore()

    useApiMock.mockResolvedValue({
      data: { value: { accessToken: 'fake-token-123' } },
      error: { value: null }
    })

    await store.login({ login: 'admin', password: '123' })

    expect(cookieRef.value).toBe('fake-token-123')

    expect(store.token).toBe('fake-token-123')
    expect(store.isLogged).toBe(true)
  })

  it('login() should reject on fail', async () => {
    const store = useAuthStore()

    useApiMock.mockResolvedValue({
      data: { value: null },
      error: { value: { message: 'Invalid credentials' } }
    })

    await expect(store.login({ login: 'admin', password: 'wrong' }))
      .rejects.toBeTruthy()

    expect(store.token).toBeNull()
  })

  it('logout() should clear store', () => {
    const store = useAuthStore()

    cookieRef.value = 'some-token'
    store.user = { login: 'test' } as any

    store.logout()

    expect(cookieRef.value).toBeNull()
    expect(store.user).toBeNull()
  })
})
