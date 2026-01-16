import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import AccountBadge from '../AccountBadge.vue'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

const { mockUseAsyncData } = vi.hoisted(() => {
  return { mockUseAsyncData: vi.fn() }
})

mockNuxtImport('useAccounts', () => {
  return () => ({ fetchAccount: vi.fn() })
})

mockNuxtImport('useAsyncData', () => {
  return mockUseAsyncData
})

const USkeletonStub = {
  name: 'USkeleton',
  template: `
    <div data-testid="skeleton" />
  `
}

const UButtonStub = { name: 'UButton', template: '<button data-testid="button"><slot /></button>' }

describe('AccountsBadge', () => {
  const accountId = 'account-123'
  const accountLogin = 'Super Admin'

  const defaultMocks = {
    global: {
      stubs: {
        USkeleton: USkeletonStub,
        UButton: UButtonStub
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show skeleton while pending request', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref(null),
      status: ref('pending'),
      refresh: vi.fn(),
      clear: vi.fn(),
      error: ref(null)
    })

    const wrapper = await mountSuspended(AccountBadge, {
      ...defaultMocks,
      props: { modelValue: true, accountId }
    })

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain(accountId)
  })

  it('show account id on error', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(new Error('Failed'))
    })

    const wrapper = await mountSuspended(AccountBadge, {
      ...defaultMocks,
      props: { modelValue: true, accountId }
    })

    await flushPromises()

    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UButton' }).exists()).toBe(false)
    expect(wrapper.text()).toContain(accountId)
  })

  it('should show button with account login on success', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref({ id: accountId, login: accountLogin }),
      status: ref('success')
    })

    const wrapper = await mountSuspended(AccountBadge, {
      ...defaultMocks,
      props: { modelValue: true, accountId }
    })

    await flushPromises()

    console.warn(wrapper.html())

    const btn = wrapper.find('[data-testid="button"]')
    expect(btn.exists()).toBe(true)

    expect(wrapper.text()).toContain(accountLogin)
  })
})
