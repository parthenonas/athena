import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import SettingsPage from '../settings.vue'
import { nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

const {
  fetchAccountMock,
  changePasswordMock,
  mockUseAsyncData,
  formatDate,
  fetchMeMock,
  updateMeMock,
  createMeMock,
  uploadFileMock,
  deleteFileMock
} = vi.hoisted(() => ({
  fetchAccountMock: vi.fn(),
  changePasswordMock: vi.fn(),
  mockUseAsyncData: vi.fn(),
  formatDate: vi.fn(),
  fetchMeMock: vi.fn(),
  updateMeMock: vi.fn(),
  createMeMock: vi.fn(),
  uploadFileMock: vi.fn(),
  deleteFileMock: vi.fn()
}))

vi.mock('@athena/common', () => ({
  PASSWORD_REGEX: /.+/,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => key + (params ? JSON.stringify(params) : '')
  })
}))

mockNuxtImport('useAppDate', () => {
  return () => ({ formatDate })
})

mockNuxtImport('useAsyncData', () => {
  return mockUseAsyncData
})

mockNuxtImport('useAccounts', () => {
  return () => ({
    fetchAccount: fetchAccountMock,
    changePassword: changePasswordMock
  })
})

mockNuxtImport('useProfiles', () => {
  return () => ({
    fetchMe: fetchMeMock,
    updateMe: updateMeMock,
    createMe: createMeMock
  })
})

mockNuxtImport('useMedia', () => {
  return () => ({
    uploadFile: uploadFileMock,
    deleteFile: deleteFileMock
  })
})

const UCardStub = { template: '<div><slot /><slot name="header" /></div>' }
const UAvatarStub = { template: '<div data-testid="avatar" :src="src" />', props: ['alt', 'src'] }
const USkeletonStub = { template: '<div data-testid="skeleton" />' }
const AdminRoleBadgeStub = { template: '<div data-testid="role-badge" />', props: ['roleId'] }
const UIconStub = { template: '<div />' }
const USeparatorStub = { template: '<hr />' }
const UFormFieldStub = { template: '<div><slot /></div>' }
const UButtonStub = { template: '<button type="submit"><slot/></button>' }

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
    fetchAccountMock.mockResolvedValue({ id: 'user-1', login: 'test_user' })
    fetchMeMock.mockResolvedValue({ firstName: 'Ivan', lastName: 'Ivanov', avatarUrl: 'http://old.jpg' })

    const wrapper = await mountSuspended(SettingsPage, defaultMocks)

    await flushPromises()
    await nextTick()

    expect(fetchMeMock).toHaveBeenCalled()

    const inputs = wrapper.findAllComponents(UInputStub)
    expect(inputs[0]!.props('modelValue')).toBe('Ivan')

    const avatar = wrapper.findComponent(UAvatarStub)
    expect(avatar.exists()).toBe(true)
    expect(avatar.props('src')).toBe('http://old.jpg')
  })

  it('should handle avatar removal', async () => {
    fetchAccountMock.mockResolvedValue({ id: 'user-1', login: 'user' })
    fetchMeMock.mockResolvedValue({
      firstName: 'Ivan',
      lastName: 'Ivanov',
      avatarUrl: 'http://old.jpg'
    })

    const wrapper = await mountSuspended(SettingsPage, defaultMocks)

    await flushPromises()
    await nextTick()

    const removeBtn = wrapper.find('[data-testid="remove-avatar-btn"]')

    expect(removeBtn.exists()).toBe(true)

    await removeBtn.trigger('click')

    expect(updateMeMock).toHaveBeenCalledWith({ avatarUrl: null })
  })

  it('should handle avatar upload', async () => {
    fetchAccountMock.mockResolvedValue({ id: 'user-1', login: 'user' })
    fetchMeMock.mockResolvedValue({ firstName: 'Ivan', lastName: 'Ivanov', avatarUrl: 'http://old.jpg' })

    const wrapper = await mountSuspended(SettingsPage, defaultMocks)
    await flushPromises()

    uploadFileMock.mockResolvedValue({ url: 'http://new-avatar.jpg' })

    const input = wrapper.find('input[type="file"]')
    const file = new File(['(⌐□_□)'], 'avatar.png', { type: 'image/png' })

    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')

    await flushPromises()

    expect(uploadFileMock).toHaveBeenCalledWith(file, 'public')
    expect(updateMeMock).toHaveBeenCalledWith({ avatarUrl: 'http://new-avatar.jpg' })
  })

  it('should handle profile update submission', async () => {
    fetchAccountMock.mockResolvedValue({ id: 'user-1', login: 'user' })
    fetchMeMock.mockResolvedValue({ firstName: 'Ivan', lastName: 'Ivanov' })

    const wrapper = await mountSuspended(SettingsPage, defaultMocks)
    await flushPromises()

    const forms = wrapper.findAllComponents(UFormStub)
    const profileForm = forms[0]!

    const state = profileForm.props('state')
    state.firstName = 'Petr'
    state.lastName = 'Petrov'

    await profileForm.trigger('submit')

    expect(updateMeMock).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Petr',
      lastName: 'Petrov'
    }))
  })

  it('should handle password change submission', async () => {
    fetchAccountMock.mockResolvedValue({ id: 'user-1', login: 'user' })
    fetchMeMock.mockResolvedValue({ firstName: 'Ivan', lastName: 'Ivanov' })

    const wrapper = await mountSuspended(SettingsPage, defaultMocks)
    await flushPromises()

    const forms = wrapper.findAllComponents(UFormStub)
    const passwordForm = forms[1]!

    const state = passwordForm.props('state')
    state.oldPassword = 'OldPass'
    state.newPassword = 'NewPass123'
    state.confirmPassword = 'NewPass123'

    await passwordForm.trigger('submit')

    expect(changePasswordMock).toHaveBeenCalledWith({
      oldPassword: 'OldPass',
      newPassword: 'NewPass123'
    })
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
