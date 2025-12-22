import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

import DefaultLayout from '../default.vue'
import { UDropdownMenu } from '#components'

const { authState, logoutMock } = vi.hoisted(() => ({
  authState: {
    isLogged: false,
    user: null as any
  },
  logoutMock: vi.fn()
}))

mockNuxtImport('useAuthStore', () => {
  return () => ({
    get isLogged() { return authState.isLogged },
    get user() { return authState.user },
    logout: logoutMock
  })
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (key: string) => key,
    locale: { value: 'en' },
    setLocale: vi.fn()
  })
})

describe('Default Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.isLogged = false
    authState.user = null
  })

  it('GUEST: should render Login button', async () => {
    const component = await mountSuspended(DefaultLayout, {
      global: {
        stubs: {
          UDashboardSidebar: true,
          UDashboardGroup: true,
          NuxtPage: true
        }
      }
    })

    const buttons = component.findAllComponents({ name: 'UButton' })
    const loginBtn = buttons.find(btn => btn.props('to') === '/auth/login')
    expect(loginBtn?.exists()).toBe(true)
    expect(loginBtn?.text()).toContain('Log in')

    const dropdown = component.findComponent(UDropdownMenu as any)
    expect(dropdown.exists()).toBe(false)
  })

  it('USER: should render user avatar and name', async () => {
    authState.isLogged = true
    authState.user = { login: 'TestUser_Boss' }

    const component = await mountSuspended(DefaultLayout, {
      global: {
        stubs: {
          UDashboardSidebar: true,
          UDashboardGroup: true,
          NuxtPage: true
        }
      }
    })

    const buttons = component.findAllComponents({ name: 'UButton' })
    const loginBtn = buttons.find(btn => btn.props('to') === '/auth/login')
    expect(loginBtn).toBe(undefined)

    const dropdown = component.findComponent(UDropdownMenu as any)
    expect(dropdown.exists()).toBe(true)

    const avatar = component.findComponent({ name: 'UAvatar' })
    expect(avatar.exists()).toBe(true)
    expect(avatar.props('alt')).toBe('TestUser_Boss')
  })

  it('USER: should call logout when clicked in menu', async () => {
    authState.isLogged = true
    authState.user = { login: 'TestUser_Boss' }

    const component = await mountSuspended(DefaultLayout)
    const dropdown = component.findComponent(UDropdownMenu as any)
    const items = dropdown.props('items') as any[][]
    const logoutItem = items?.[2]?.[0]

    expect(logoutItem.label).toContain('logout')
    logoutItem.onSelect()

    expect(logoutMock).toHaveBeenCalled()
  })
})
