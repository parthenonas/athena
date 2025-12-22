import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoginPage from '../login.vue'
import { UAuthForm } from '#components'

const { loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn()
}))

mockNuxtImport('useAuthStore', () => {
  return () => ({
    login: loginMock
  })
})

const { toastAddMock } = vi.hoisted(() => ({
  toastAddMock: vi.fn()
}))

mockNuxtImport('useToast', () => {
  return () => ({
    add: toastAddMock
  })
})

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn()
}))
mockNuxtImport('navigateTo', () => navigateToMock)

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call authStore.login on form submit', async () => {
    const component = await mountSuspended(LoginPage)

    const form = component.findComponent(UAuthForm as any)
    expect(form.exists()).toBe(true)

    const credentials = { login: 'user', password: 'password' }
    await form.vm.$emit('submit', { data: credentials })

    expect(loginMock).toHaveBeenCalledWith(credentials)
  })

  it('should redirect to home on success', async () => {
    loginMock.mockResolvedValue(true)

    const component = await mountSuspended(LoginPage)
    const form = component.findComponent(UAuthForm as any)

    await form.vm.$emit('submit', { data: { login: 'ok', password: 'ok' } })

    expect(toastAddMock).toHaveBeenCalled()
    const toastArgs = toastAddMock?.mock?.calls?.[0]?.[0]
    expect(toastArgs.color).toBe('success')

    expect(navigateToMock).toHaveBeenCalledWith('/dashboard')
  })

  it('should show error toast on failure', async () => {
    loginMock.mockRejectedValue(new Error('Invalid password'))

    const component = await mountSuspended(LoginPage)
    const form = component.findComponent(UAuthForm as any)

    await form.vm.$emit('submit', { data: { login: 'bad', password: 'bad' } })
    expect(loginMock).toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(toastAddMock).toHaveBeenCalled()
    const toastArgs = toastAddMock?.mock?.calls?.[0]?.[0]
    expect(toastArgs.color).toBe('error')
  })
})
