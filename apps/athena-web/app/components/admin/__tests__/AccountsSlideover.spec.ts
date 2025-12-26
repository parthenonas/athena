import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AccountsSlideover from '../AccountsSlideover.vue'
import { nextTick, ref } from 'vue'

const {
  fetchAccountMock,
  createAccountMock,
  updateAccountMock,
  fetchRolesMock,
  fetchRoleMock
} = vi.hoisted(() => ({
  fetchAccountMock: vi.fn(),
  createAccountMock: vi.fn(),
  updateAccountMock: vi.fn(),
  fetchRolesMock: vi.fn(),
  fetchRoleMock: vi.fn()
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

const USelectMenuStub = {
  name: 'USelectMenu',
  template: `
    <div class="u-select-menu-stub">
      <input 
        class="search-input"
        :value="searchTerm" 
        @input="$emit('update:search-term', $event.target.value)" 
      />
      <div 
        v-for="item in items" 
        :key="item.id" 
        class="option-item"
        @click="$emit('update:modelValue', item.id)"
      >
        {{ item.label }}
      </div>
    </div>
  `,
  props: ['modelValue', 'items', 'searchTerm', 'loading'],
  emits: ['update:modelValue', 'update:search-term']
}

const UButtonStub = { name: 'UButton', template: '<button />' }

describe('AccountsSlideover', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        USlideover: USlideoverStub,
        UForm: UFormStub,
        UInput: UInputStub,
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
    expect(inputs[0]!.props('modelValue')).toBe('')
    expect(inputs[1]!.props('modelValue')).toBe('')

    const select = wrapper.findComponent(USelectMenuStub)
    expect(select.props('modelValue')).toBeUndefined()
  })

  it('should load data in Edit mode', async () => {
    fetchAccountMock.mockResolvedValue({
      id: 'acc-123',
      login: 'john_doe',
      roleId: 'role-1'
    })

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: false, accountId: 'acc-123' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchAccountMock).toHaveBeenCalledWith('acc-123')

    const inputs = wrapper.findAllComponents(UInputStub)
    expect(inputs[0]!.props('modelValue')).toBe('john_doe')
    expect(inputs[1]!.props('modelValue')).toBe('')

    const select = wrapper.findComponent(USelectMenuStub)
    expect(select.props('modelValue')).toBe('role-1')
  })

  it('should handle "Specific Role" logic (loading missing role)', async () => {
    fetchAccountMock.mockResolvedValue({
      id: 'acc-123',
      login: 'lost_role_user',
      roleId: 'role-99'
    })

    fetchRoleMock.mockResolvedValue({
      id: 'role-99',
      name: 'Hidden Super Admin'
    })

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: false, accountId: 'acc-123' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchAccountMock).toHaveBeenCalledWith('acc-123')

    expect(fetchRoleMock).toHaveBeenCalledWith('role-99')

    const select = wrapper.findComponent(USelectMenuStub)
    expect(select.props('items')).toHaveLength(3)
    expect(select.props('items')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'role-99', label: 'Hidden Super Admin' })
    ]))
  })

  it('should call createAccount on submit', async () => {
    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })

    const inputs = wrapper.findAllComponents(UInputStub)
    inputs[0]!.vm.$emit('update:modelValue', 'new_user')
    inputs[1]!.vm.$emit('update:modelValue', 'password123')

    const option = wrapper.find('.option-item')
    await option.trigger('click')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createAccountMock).toHaveBeenCalledWith({
      login: 'new_user',
      password: 'password123',
      roleId: 'role-1'
    })

    expect(wrapper.emitted('refresh')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('should call updateAccount on submit (without password)', async () => {
    fetchAccountMock.mockResolvedValue({
      id: 'acc-1',
      login: 'old_login',
      roleId: 'role-1'
    })

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: false, accountId: 'acc-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const inputs = wrapper.findAllComponents(UInputStub)
    inputs[0]!.vm.$emit('update:modelValue', 'updated_login')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateAccountMock).toHaveBeenCalledWith('acc-1', {
      login: 'updated_login',
      roleId: 'role-1'
    })
  })

  it('should call updateAccount WITH password if provided', async () => {
    fetchAccountMock.mockResolvedValue({ id: 'acc-1', login: 'user', roleId: 'role-1' })

    const wrapper = await mountSuspended(AccountsSlideover, {
      ...defaultMocks,
      props: { modelValue: false, accountId: 'acc-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const inputs = wrapper.findAllComponents(UInputStub)
    inputs[1]!.vm.$emit('update:modelValue', 'new_secret_pass')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateAccountMock).toHaveBeenCalledWith('acc-1', expect.objectContaining({
      password: 'new_secret_pass'
    }))
  })
})
