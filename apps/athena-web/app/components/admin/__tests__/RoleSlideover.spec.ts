import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RolesSlideover from '../RolesSlideover.vue'
import { nextTick } from 'vue'

const { fetchRoleMock, createRoleMock, updateRoleMock } = vi.hoisted(() => ({
  fetchRoleMock: vi.fn(),
  createRoleMock: vi.fn(),
  updateRoleMock: vi.fn()
}))

vi.mock('@athena/types', () => ({
  Permission: {
    ACCOUNTS_READ: 'accounts.read',
    ACCOUNTS_CREATE: 'accounts.create',
    COURSES_READ: 'courses.read'
  },
  Policy: {
    OWN_ONLY: 'own_only',
    NOT_PUBLISHED: 'not_published',
    ONLY_PUBLISHED: 'only_published',
    PUBLISHED_OR_OWNER: 'published_or_owner'
  }
}))

vi.mock('~/composables/useRoles', () => ({
  useRoles: () => ({
    fetchRole: fetchRoleMock,
    createRole: createRoleMock,
    updateRole: updateRoleMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
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

const UCheckboxStub = {
  name: 'UCheckbox',
  template: `
    <label :data-label="label">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
      {{ label }}
    </label>
  `,
  props: ['modelValue', 'label'],
  emits: ['update:modelValue']
}

const UInputStub = {
  name: 'UInput',
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
  props: ['modelValue'],
  emits: ['update:modelValue']
}

const UButtonStub = { name: 'UButton', template: '<button />' }

const USelectMenuStub = {
  name: 'USelectMenu',
  template: `
    <div data-testid="policy-select">
      <button 
        type="button" 
        data-testid="select-own-only"
        @click="selectPolicy('own_only')"
      >
        Select Own Only
      </button>
      <div data-testid="selected-values">{{ modelValue }}</div>
    </div>
  `,
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  setup(props: any, { emit }: any) {
    const selectPolicy = (val: string) => {
      const current = props.modelValue || []
      emit('update:modelValue', [...current, val])
    }
    return { selectPolicy }
  }
}

describe('RolesSlideover', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        USlideover: USlideoverStub,
        UForm: UFormStub,
        UInput: UInputStub,
        UCheckbox: UCheckboxStub,
        UButton: UButtonStub,
        USelectMenu: USelectMenuStub,
        UFormField: { template: '<div><slot /></div>' },
        USeparator: true
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should open empty and render checkboxes', async () => {
    const wrapper = await mountSuspended(RolesSlideover, {
      ...defaultMocks,
      props: { modelValue: true, roleId: null }
    })

    expect(fetchRoleMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="title"]').text()).toContain('pages.roles.create')

    const checkboxes = wrapper.findAllComponents(UCheckboxStub)
    expect(checkboxes.length).toBe(3)
  })

  it('should load data on open', async () => {
    fetchRoleMock.mockResolvedValue({
      id: '123',
      name: 'Super Manager',
      permissions: ['accounts.read'],
      policies: {}
    })

    const wrapper = await mountSuspended(RolesSlideover, {
      ...defaultMocks,
      props: { modelValue: false, roleId: '123' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchRoleMock).toHaveBeenCalledWith('123')

    const nameInput = wrapper.findComponent(UInputStub)
    expect(nameInput.props('modelValue')).toBe('Super Manager')
  })

  it('should call createRole on submit', async () => {
    const wrapper = await mountSuspended(RolesSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })

    const nameInput = wrapper.findComponent(UInputStub)
    nameInput.vm.$emit('update:modelValue', 'New Role')

    const checkboxes = wrapper.findAllComponents(UCheckboxStub)
    const readCheckboxComponent = checkboxes.find(c => c.props('label')?.includes('read'))

    expect(readCheckboxComponent).toBeDefined()
    readCheckboxComponent?.vm.$emit('update:modelValue', true)

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createRoleMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Role',
      permissions: ['accounts.read'],
      policies: {}
    }))

    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('should call updateRole on submit (toggle permissions)', async () => {
    fetchRoleMock.mockResolvedValue({
      name: 'Old Name',
      permissions: ['accounts.read'],
      policies: {}
    })

    const wrapper = await mountSuspended(RolesSlideover, {
      ...defaultMocks,
      props: { modelValue: false, roleId: 'role-123' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const nameInput = wrapper.findComponent(UInputStub)
    nameInput.vm.$emit('update:modelValue', 'Updated Name')

    const checkboxes = wrapper.findAllComponents(UCheckboxStub)

    const readCheckbox = checkboxes[0]
    expect(readCheckbox!.props('modelValue')).toBe(true)
    readCheckbox!.vm.$emit('update:modelValue', false)
    const createCheckbox = checkboxes[1]
    expect(createCheckbox!.props('modelValue')).toBeFalsy()
    createCheckbox!.vm.$emit('update:modelValue', true)
    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')
    expect(updateRoleMock).toHaveBeenCalledWith('role-123', expect.objectContaining({
      name: 'Updated Name',
      permissions: ['accounts.create']
    }))
  })

  it('should allow adding a policy to a permission', async () => {
    const wrapper = await mountSuspended(RolesSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })

    const nameInput = wrapper.findComponent(UInputStub)
    nameInput.vm.$emit('update:modelValue', 'Policy Role')

    const checkboxes = wrapper.findAllComponents(UCheckboxStub)
    const readCheckbox = checkboxes.find(c => c.props('label')?.includes('read'))
    readCheckbox!.vm.$emit('update:modelValue', true)

    await nextTick()

    const selectMenu = wrapper.findComponent(USelectMenuStub)
    expect(selectMenu.exists()).toBe(true)

    const btn = selectMenu.find('[data-testid="select-own-only"]')
    await btn.trigger('click')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createRoleMock).toHaveBeenCalledWith(expect.objectContaining({
      permissions: ['accounts.read'],
      policies: {
        'accounts.read': ['own_only']
      }
    }))
  })

  it('should clean up policies when permission is unchecked', async () => {
    fetchRoleMock.mockResolvedValue({
      name: 'Manager',
      permissions: ['accounts.read'],
      policies: { 'accounts.read': ['own_only'] }
    })

    const wrapper = await mountSuspended(RolesSlideover, {
      ...defaultMocks,
      props: { modelValue: false, roleId: 'role-pol' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.findComponent(USelectMenuStub).exists()).toBe(true)

    const checkboxes = wrapper.findAllComponents(UCheckboxStub)
    const readCheckbox = checkboxes.find(c => c.props('label')?.includes('read'))
    readCheckbox!.vm.$emit('update:modelValue', false)

    await nextTick()

    expect(wrapper.findComponent(USelectMenuStub).exists()).toBe(false)

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateRoleMock).toHaveBeenCalledWith('role-pol', expect.objectContaining({
      permissions: [],
      policies: {}
    }))
  })
})
