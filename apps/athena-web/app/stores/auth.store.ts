import { defineStore } from 'pinia'
import type { AccountResponse, LoginRequest, TokenResponse } from '@athena/types'

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie('athena_access_token', {
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })

  const user = ref<AccountResponse | null>(null)

  const isLogged = computed(() => !!token.value)

  async function login(credentials: LoginRequest) {
    try {
      const { data, error } = await useApi<TokenResponse>('/accounts/login', {
        method: 'POST',
        body: credentials
      })

      if (error.value) throw error.value
      if (!data.value) throw new Error('No data received')

      token.value = data.value.accessToken

      return true
    } catch (err) {
      console.error('Login failed:', err)
      throw err
    }
  }

  function logout() {
    token.value = null
    user.value = null
    navigateTo('/login')
  }

  return {
    token,
    user,
    isLogged,
    login,
    logout
  }
}, {
  persist: {
    pick: ['user']
  }
})
