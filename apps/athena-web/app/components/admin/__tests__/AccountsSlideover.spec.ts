import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AccountsSlideover from '../AccountsSlideover.vue'
import { nextTick, ref } from 'vue'

const {
  fetchAccountMock,
  createAccountMock,
  updateAccountMock,
  fetchRolesMock,
  fetchRoleMock,
  fetchProfileMock,
  createProfileMock,
  updateProfileMock
} = vi.hoisted(() => ({
  fetchAccountMock: vi.fn(),
  createAccountMock: vi.fn(),
  updateAccountMock: vi.fn(),
  fetchRolesMock: vi.fn(),
  fetchRoleMock: vi.fn(),
  fetchProfileMock: vi.fn(),
  createProfileMock: vi.fn(),
  updateProfileMock: vi.fn()
}))

vi.mock('~/composables/useAccounts', () => ({
  useAccounts: () => ({
    fetchAccount: fetchAccountMock,
    createAccount: createAccountMock,
    updateAccount: updateAccountMock
  })
}))

vi.mock('~/composables/useRoles', () => ({
  useRoles: () => ({
    fetchRoles: fetchRolesMock,
    fetchRole: fetchRoleMock
  })
}))

vi.mock('~/composables/useProfiles', () => ({
  useProfiles: () => ({
    fetchProfile: fetchProfileMock,
    createProfile: createProfileMock,
    updateProfile: updateProfileMock
  })
}))

vi.mock('~/utils/dates', () => ({
  toCalendarDate: (val: any) => val,
  toNativeDate: (val: any) => val
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const USlideoverStub = {
  name: 'USlideover',
  template: `
    <div v-if="open" data-testid="slideover">
      <div data-testid="title">{{ title }}</div>
      <slot name="body" />
      <slot name="footer" />
    </div>
  `,
  props: ['open', 'title', 'ui']
}

const UTabsStub = {
  name: 'UTabs',
  template: `
    <div class="u-tabs-stub">
      <slot name="account" />
      <slot name="profile" />
    </div>
  `,
  props: ['items']
}

const UFormStub = {
  name: 'UForm',
  template: `<form @submit.prevent="submit"><slot /></form>`,
  props: ['state', 'schema'],
  emits: ['submit'],
  setup(props: any, { emit }: any) {
    return {
      submit: () => emit('submit', { data: props.state })
    }
  }
}

const UInputStub = {
  name: 'UInput',
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" class="u-input-stub" />`,
  props: ['modelValue'],
  emits: ['update:modelValue']
}

const UInputDateStub = {
  name: 'UInputDate',
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" class="u-input-date-stub" />`,
  props: ['modelValue'],
  emits: ['update:modelValue']
}

const USelectMenuStub = {
  name: 'USelectMenu',
  template: `
    <div class="u-select-menu-stub">
      <div 
        v-for="item in items" 
        class="option-item"
        @click="$emit('update:modelValue', item.id)"
      >
        {{ item.label }}
      </div>
    </div>
  `,
  props: ['modelValue', 'items', 'loading'],
  emits: ['update:modelValue']
}

const UButtonStub = { name: 'UButton', template: '<button />' }

describe('AccountsSlideover', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        USlideover: USlideoverStub,
        UForm: UFormStub,
        UTabs: UTabsStub,
        UInput: UInputStub,
        UInputDate: UInputDateStub,
        USelectMenu: USelectMenuStub,
        UButton: UButtonStub,
        UFormField: { template: '<div><slot /></div>' }
      }
    }
  }

  const mockRolesList = [
    { id: 'role-1', name: 'Admin' },
    { id: 'role-2', name: 'User' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    fetchRolesMock.mockResolvedValue({
      data: ref({ data: mockRolesList }),
      pending: ref(false)
    })
  })

  it('should open empty in Create mode', async () => {
    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: true, accountId: null }
    })

    expect(wrapper.find('[data-testid="title"]').text()).toContain('pages.accounts.create')

    const inputs = wrapper.findAllComponents(UInputStub)
    expect(inputs.length).toBe(5)
    inputs.forEach(input => expect(input.props('modelValue')).toBe(''))

    const dateInput = wrapper.findComponent(UInputDateStub)
    expect(dateInput.exists()).toBe(true)
    expect(dateInput.props('modelValue')).toBeNull()
  })

  it('should load Account and Profile data in Edit mode', async () => {
    fetchAccountMock.mockResolvedValue({
      id: 'acc-123',
      login: 'john_doe',
      roleId: 'role-1'
    })

    fetchProfileMock.mockResolvedValue({
      firstName: 'John',
      lastName: 'Doe',
      patronymic: 'Smith',
      birthDate: '1990-01-01'
    })

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: false, accountId: 'acc-123' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchAccountMock).toHaveBeenCalledWith('acc-123')
    expect(fetchProfileMock).toHaveBeenCalledWith('acc-123')

    const inputs = wrapper.findAllComponents(UInputStub)
    expect(inputs[0]!.props('modelValue')).toBe('john_doe')
    expect(inputs[1]!.props('modelValue')).toBe('')
    expect(inputs[2]!.props('modelValue')).toBe('Doe')
    expect(inputs[3]!.props('modelValue')).toBe('John')
    expect(inputs[4]!.props('modelValue')).toBe('Smith')

    const dateInput = wrapper.findComponent(UInputDateStub)
    expect(dateInput.props('modelValue')).toBe('1990-01-01')
  })

  it('should call createAccount AND createProfile on submit (Create Mode)', async () => {
    createAccountMock.mockResolvedValue({ id: 'new-acc-id' })

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })

    const inputs = wrapper.findAllComponents(UInputStub)
    const dateInput = wrapper.findComponent(UInputDateStub)

    inputs[0]!.vm.$emit('update:modelValue', 'new_user')
    inputs[1]!.vm.$emit('update:modelValue', 'password123')

    const option = wrapper.find('.option-item')
    await option.trigger('click')

    inputs[2]!.vm.$emit('update:modelValue', 'User')
    inputs[3]!.vm.$emit('update:modelValue', 'New')
    inputs[4]!.vm.$emit('update:modelValue', 'Test')
    dateInput.vm.$emit('update:modelValue', '2000-01-01')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createAccountMock).toHaveBeenCalledWith({
      login: 'new_user',
      password: 'password123',
      roleId: 'role-1'
    })

    expect(createProfileMock).toHaveBeenCalledWith('new-acc-id', {
      firstName: 'New',
      lastName: 'User',
      patronymic: 'Test',
      birthDate: '2000-01-01'
    })

    expect(wrapper.emitted('refresh')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('should call updateAccount AND updateProfile when profile exists', async () => {
    fetchAccountMock.mockResolvedValue({ id: 'acc-1', login: 'old', roleId: 'role-1' })
    fetchProfileMock.mockResolvedValue({ firstName: 'Old', lastName: 'Name' })

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: false, accountId: 'acc-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const inputs = wrapper.findAllComponents(UInputStub)
    inputs[3]!.vm.$emit('update:modelValue', 'UpdatedFirst')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateAccountMock).toHaveBeenCalledWith('acc-1', expect.objectContaining({
      login: 'old'
    }))

    expect(updateProfileMock).toHaveBeenCalledWith('acc-1', expect.objectContaining({
      firstName: 'UpdatedFirst'
    }))
    expect(createProfileMock).not.toHaveBeenCalled()
  })

  it('should call updateAccount AND createProfile when profile is missing (Fallback)', async () => {
    fetchAccountMock.mockResolvedValue({ id: 'acc-1', login: 'old', roleId: 'role-1' })
    fetchProfileMock.mockResolvedValue(null)

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: false, accountId: 'acc-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const inputs = wrapper.findAllComponents(UInputStub)
    inputs[3]!.vm.$emit('update:modelValue', 'NewProfile')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateAccountMock).toHaveBeenCalled()
    expect(updateProfileMock).not.toHaveBeenCalled()
    expect(createProfileMock).toHaveBeenCalledWith('acc-1', expect.objectContaining({
      firstName: 'NewProfile'
    }))
  })

  it('should try updateProfile then createProfile if update throws 404 (Edge Case)', async () => {
    fetchAccountMock.mockResolvedValue({ id: 'acc-1' })
    fetchProfileMock.mockResolvedValue(null)

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: true, accountId: 'acc-1' }
    })

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createProfileMock).toHaveBeenCalled()
  })
})
