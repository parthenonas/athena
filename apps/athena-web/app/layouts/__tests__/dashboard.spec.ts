import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { UDropdownMenu, UNavigationMenu } from '#components'
import DashboardLayout from '../dashboard.vue'

const { logoutMock, setLocaleMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  setLocaleMock: vi.fn()
}))

const localeRef = ref('en')

mockNuxtImport('useAuthStore', () => {
  return () => ({
    user: {
      login: 'Big_Boss',
      avatarUrl: ''
    },
    logout: logoutMock
  })
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (key: string) => key,
    locale: localeRef,
    setLocale: (val: string) => {
      localeRef.value = val
      setLocaleMock(val)
    }
  })
})

describe('Dashboard Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localeRef.value = 'en'
  })

  it('should render all menu sections (Student, Studio, Admin)', async () => {
    const component = await mountSuspended(DashboardLayout, {
      global: {
        stubs: {
          UDashboardSidebar: {
            template: `
              <div>
                <slot :collapsed="false" />
                <slot name="header" :collapsed="false" />
                <slot name="footer" :collapsed="false" />
              </div>
            `
          },
          UDashboardGroup: { template: '<div><slot /></div>' },
          NuxtPage: true
        }
      }
    })

    expect(component.text()).toContain('ATHENA')
    const menus = component.findAllComponents(UNavigationMenu as any)
    expect(menus.length).toBeGreaterThan(0)
    const allLabels: string[] = []

    menus.forEach((menu) => {
      const items = menu.props('items') as any[]

      if (items) {
        const flatItems = items.flat()

        flatItems.forEach((item) => {
          if (item.label) allLabels.push(item.label)

          if (item.children) {
            item.children.forEach((child: any) => allLabels.push(child.label))
          }
        })
      }
    })

    expect(allLabels).toContain('pages.dashboard.my-learning')
    expect(allLabels).toContain('pages.dashboard.studio-overview')
    expect(allLabels).toContain('pages.dashboard.users')
  })

  it('should render user info in footer', async () => {
    const component = await mountSuspended(DashboardLayout, {
      global: {
        stubs: {
          UDashboardSidebar: {
            template: '<div><slot :collapsed="false" /><slot name="footer" :collapsed="false" /></div>'
          },
          UDashboardGroup: { template: '<div><slot /></div>' },
          NuxtPage: true
        }
      }
    })

    expect(component.text()).toContain('Big_Boss')
  })

  it('should trigger logout when clicked in menu', async () => {
    const component = await mountSuspended(DashboardLayout, {
      global: {
        stubs: {
          UDashboardSidebar: {
            template: '<div><slot :collapsed="false" /><slot name="footer" :collapsed="false" /></div>'
          },
          UDashboardGroup: { template: '<div><slot /></div>' },
          NuxtPage: true
        }
      }
    })

    const dropdown = component.findComponent(UDropdownMenu as any)
    const items = dropdown.props('items') as any[][]
    const logoutItem = items[items.length - 1]?.[0]

    logoutItem.onSelect()
    expect(logoutMock).toHaveBeenCalled()
  })

  it('should toggle language', async () => {
    const component = await mountSuspended(DashboardLayout, {
      global: {
        stubs: {
          UDashboardSidebar: {
            template: '<div><slot :collapsed="false" /><slot name="footer" :collapsed="false" /></div>'
          },
          UDashboardGroup: { template: '<div><slot /></div>' },
          NuxtPage: true
        }
      }
    })

    const buttons = component.findAllComponents({ name: 'UButton' })
    const langBtn = buttons.find(btn => btn.props('icon') === 'i-lucide-languages')

    expect(langBtn).toBeDefined()

    await langBtn?.vm.$emit('click')

    expect(setLocaleMock).toHaveBeenCalledWith('ru')
  })
})
