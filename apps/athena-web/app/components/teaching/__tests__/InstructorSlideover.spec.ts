import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TeachingInstructorSlideover from '../InstructorSlideover.vue'
import { nextTick, ref } from 'vue'

const {
  fetchInstructorMock,
  createInstructorMock,
  updateInstructorMock,
  fetchAccountsMock,
  fetchAccountMock
} = vi.hoisted(() => ({
  fetchInstructorMock: vi.fn(),
  createInstructorMock: vi.fn(),
  updateInstructorMock: vi.fn(),
  fetchAccountsMock: vi.fn(),
  fetchAccountMock: vi.fn()
}))

vi.mock('~/composables/useTeaching', () => ({
  useTeaching: () => ({
    fetchInstructor: fetchInstructorMock,
    createInstructor: createInstructorMock,
    updateInstructor: updateInstructorMock
  })
}))

vi.mock('~/composables/useAccounts', () => ({
  useAccounts: () => ({
    fetchAccounts: fetchAccountsMock,
    fetchAccount: fetchAccountMock
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

const UTextareaStub = {
  name: 'UTextarea',
  template: `<textarea :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" class="u-textarea-stub" />`,
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

describe('TeachingInstructorSlideover', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        USlideover: USlideoverStub,
        UForm: UFormStub,
        UInput: UInputStub,
        UTextarea: UTextareaStub,
        USelectMenu: USelectMenuStub,
        UButton: UButtonStub,
        UFormField: { template: '<div><slot /></div>' }
      }
    }
  }

  const mockAccountsList = [
    { id: 'acc-1', login: 'user_one' },
    { id: 'acc-2', login: 'user_two' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    fetchAccountsMock.mockResolvedValue({
      data: ref({ data: mockAccountsList }),
      pending: ref(false)
    })
  })

  it('should open empty in Create mode', async () => {
    const wrapper = await mountSuspended(TeachingInstructorSlideover, {
      ...defaultMocks,
      props: { modelValue: true, instructorId: null }
    })

    expect(wrapper.find('[data-testid="title"]').text()).toContain('pages.teaching.instructors.create-title')

    const input = wrapper.findComponent(UInputStub)
    expect(input.props('modelValue')).toBe('')

    const textarea = wrapper.findComponent(UTextareaStub)
    expect(textarea.props('modelValue')).toBe('')

    const select = wrapper.findComponent(USelectMenuStub)
    expect(select.props('modelValue')).toBe('')
  })

  it('should load data in Edit mode', async () => {
    fetchInstructorMock.mockResolvedValue({
      id: 'inst-1',
      ownerId: 'acc-1',
      title: 'Professor X',
      bio: 'Telepath'
    })

    const wrapper = await mountSuspended(TeachingInstructorSlideover, {
      ...defaultMocks,
      props: { modelValue: false, instructorId: 'inst-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchInstructorMock).toHaveBeenCalledWith('inst-1')

    const input = wrapper.findComponent(UInputStub)
    expect(input.props('modelValue')).toBe('Professor X')

    const textarea = wrapper.findComponent(UTextareaStub)
    expect(textarea.props('modelValue')).toBe('Telepath')

    const select = wrapper.findComponent(USelectMenuStub)
    expect(select.props('modelValue')).toBe('acc-1')
  })

  it('should handle "Specific Account" logic (loading missing account in select)', async () => {
    fetchInstructorMock.mockResolvedValue({
      id: 'inst-99',
      ownerId: 'acc-99',
      title: 'Hidden Prof',
      bio: ''
    })

    fetchAccountMock.mockResolvedValue({
      id: 'acc-99',
      login: 'hidden_user'
    })

    const wrapper = await mountSuspended(TeachingInstructorSlideover, {
      ...defaultMocks,
      props: { modelValue: false, instructorId: 'inst-99' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchInstructorMock).toHaveBeenCalledWith('inst-99')
    expect(fetchAccountMock).toHaveBeenCalledWith('acc-99')

    const select = wrapper.findComponent(USelectMenuStub)
    expect(select.props('items')).toHaveLength(3)
    expect(select.props('items')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'acc-99', label: 'hidden_user' })
    ]))
  })

  it('should call createInstructor on submit', async () => {
    const wrapper = await mountSuspended(TeachingInstructorSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })

    const select = wrapper.findComponent(USelectMenuStub)
    select.vm.$emit('update:modelValue', 'acc-2')

    const input = wrapper.findComponent(UInputStub)
    input.vm.$emit('update:modelValue', 'New Doc')

    const textarea = wrapper.findComponent(UTextareaStub)
    textarea.vm.$emit('update:modelValue', 'Bio info')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createInstructorMock).toHaveBeenCalledWith({
      ownerId: 'acc-2',
      title: 'New Doc',
      bio: 'Bio info'
    })

    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('should call updateInstructor on submit (Edit mode)', async () => {
    fetchInstructorMock.mockResolvedValue({
      id: 'inst-1',
      ownerId: 'acc-1',
      title: 'Old Title',
      bio: 'Old Bio'
    })

    const wrapper = await mountSuspended(TeachingInstructorSlideover, {
      ...defaultMocks,
      props: { modelValue: false, instructorId: 'inst-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const input = wrapper.findComponent(UInputStub)
    input.vm.$emit('update:modelValue', 'Updated Title')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateInstructorMock).toHaveBeenCalledWith('inst-1', {
      title: 'Updated Title',
      bio: 'Old Bio'
    })
  })
})
