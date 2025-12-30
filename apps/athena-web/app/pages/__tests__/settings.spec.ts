import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import SettingsPage from '../settings.vue'
import { nextTick } from 'vue'

const { fetchAccountMock, changePasswordMock, mockUseAsyncData } = vi.hoisted(() => ({
  fetchAccountMock: vi.fn(),
  changePasswordMock: vi.fn(),
  mockUseAsyncData: vi.fn()
}))

mockNuxtImport('useAsyncData', () => {
  return mockUseAsyncData
})

mockNuxtImport('useAccounts', () => {
  return () => ({
    fetchAccount: fetchAccountMock,
    changePassword: changePasswordMock
  })
})

vi.mock('@athena/common', () => ({
  PASSWORD_REGEX: /.+/
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => key + (params ? JSON.stringify(params) : '')
  })
}))

const UCardStub = { template: '<div><slot /><slot name="header" /></div>' }
const UAvatarStub = { template: '<div data-testid="avatar" />', props: ['alt'] }
const USkeletonStub = { template: '<div data-testid="skeleton" />' }
const AdminRoleBadgeStub = { template: '<div data-testid="role-badge" />', props: ['roleId'] }
const UIconStub = { template: '<div />' }
const USeparatorStub = { template: '<hr />' }
const UFormFieldStub = { template: '<div><slot /></div>' }
const UButtonStub = { template: '<button />' }

const UInputStub = {
  name: 'UInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" data-testid="input" />`
}

const UFormStub = {
  name: 'UForm',
  props: ['state', 'schema'],
  emits: ['submit'],
  template: `<form @submit.prevent="$emit('submit', { data: state })"><slot /></form>`
}

describe('Settings Page', () => {
  const defaultMocks = {
    global: {
      stubs: {
        UCard: UCardStub,
        UAvatar: UAvatarStub,
        USkeleton: USkeletonStub,
        AdminRoleBadge: AdminRoleBadgeStub,
        UIcon: UIconStub,
        USeparator: USeparatorStub,
        UFormField: UFormFieldStub,
        UInput: UInputStub,
        UButton: UButtonStub,
        UForm: UFormStub
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAsyncData.mockImplementation(async (key, handler) => {
      const result = handler ? await handler() : null
      return {
        data: ref(result),
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
        clear: vi.fn()
      }
    })
  })

  it('should render user profile data', async () => {
    fetchAccountMock.mockResolvedValue({
      id: 'user-123',
      login: 'test_user',
      roleId: 'role-admin',
      createdAt: '2023-01-01T00:00:00.000Z'
    })

    const wrapper = await mountSuspended(SettingsPage, defaultMocks)

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchAccountMock).toHaveBeenCalledWith('me')
    expect(wrapper.text()).toContain('test_user')
    expect(wrapper.text()).toContain('ID: user-123')

    const avatar = wrapper.findComponent(UAvatarStub)
    expect(avatar.props('alt')).toBe('test_user')

    const badge = wrapper.findComponent(AdminRoleBadgeStub)
    expect(badge.props('roleId')).toBe('role-admin')
  })

  it('should handle password change submission', async () => {
    fetchAccountMock.mockResolvedValue({ id: '1', login: 'user' })

    const wrapper = await mountSuspended(SettingsPage, defaultMocks)

    const inputs = wrapper.findAllComponents(UInputStub)

    const oldPassInput = inputs[0]!
    const newPassInput = inputs[1]!
    const confirmPassInput = inputs[2]!

    oldPassInput.vm.$emit('update:modelValue', 'OldPass123!')
    newPassInput.vm.$emit('update:modelValue', 'NewPass123!')
    confirmPassInput.vm.$emit('update:modelValue', 'NewPass123!')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(changePasswordMock).toHaveBeenCalledWith({
      oldPassword: 'OldPass123!',
      newPassword: 'NewPass123!'
    })

    expect(oldPassInput.props('modelValue')).toBe('')
    expect(newPassInput.props('modelValue')).toBe('')
    expect(confirmPassInput.props('modelValue')).toBe('')
  })

  it('should show skeleton when loading', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref(null),
      status: ref('pending'),
      refresh: vi.fn(),
      clear: vi.fn(),
      error: ref(null)
    })

    const wrapper = await mountSuspended(SettingsPage, defaultMocks)

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)
  })
})
