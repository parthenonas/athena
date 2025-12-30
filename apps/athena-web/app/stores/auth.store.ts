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
      const { data, error } = await useApi<TokenResponse>('/api/accounts/login', {
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
    return navigateTo('/auth/login')
  }

  async function getMe() {
    try {
      const { data, error } = await useApi<AccountResponse>('/api/accounts/me', {
        method: 'GET'
      })

      if (error.value) throw error.value
      if (!data.value) throw new Error('No data received')

      user.value = data.value

      return true
    } catch (err) {
      console.error('Update user data failed:', err)
      throw err
    }
  }

  return {
    token,
    user,
    isLogged,
    login,
    logout,
    getMe
  }
}, {
  persist: {
    pick: ['user']
  }
})
