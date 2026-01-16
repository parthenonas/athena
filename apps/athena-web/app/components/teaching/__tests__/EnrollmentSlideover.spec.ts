import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EnrollmentSlideover from '../EnrollmentSlideover.vue'
import { nextTick, ref } from 'vue'
import { EnrollmentStatus } from '@athena/types'

const {
  createEnrollmentMock,
  updateEnrollmentMock,
  fetchEnrollmentMock,
  fetchCohortsMock,
  fetchAccountsMock
} = vi.hoisted(() => ({
  createEnrollmentMock: vi.fn(),
  updateEnrollmentMock: vi.fn(),
  fetchEnrollmentMock: vi.fn(),
  fetchCohortsMock: vi.fn(),
  fetchAccountsMock: vi.fn()
}))

vi.mock('~/composables/useTeaching', () => ({
  useTeaching: () => ({
    createEnrollment: createEnrollmentMock,
    updateEnrollment: updateEnrollmentMock,
    fetchEnrollment: fetchEnrollmentMock,
    fetchCohorts: fetchCohortsMock
  })
}))

vi.mock('~/composables/useAccounts', () => ({
  useAccounts: () => ({
    fetchAccounts: fetchAccountsMock
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
  props: ['open', 'title']
}

const UFormStub = {
  name: 'UForm',
  template: `<form @submit.prevent="submit"><slot /></form>`,
  props: ['state'],
  emits: ['submit'],
  setup(props: any, { emit }: any) {
    return {
      submit: () => emit('submit', { data: props.state })
    }
  }
}

const USelectMenuStub = {
  name: 'USelectMenu',
  template: `
    <div class="u-select-menu-stub" @click="emitChange">
       <div v-for="item in items" :key="item.id">{{ item.label }}</div>
    </div>
  `,
  props: ['modelValue', 'items', 'disabled'],
  emits: ['update:modelValue'],
  setup(props: any, { emit }: any) {
    return {
      emitChange: () => {
        if (!props.disabled && props.items.length > 0) emit('update:modelValue', props.items[0].id)
      }
    }
  }
}

const USelectStub = {
  name: 'USelect',
  template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" />`,
  props: ['modelValue', 'items'],
  emits: ['update:modelValue']
}

const UButtonStub = { name: 'UButton', template: '<button />' }

describe('EnrollmentSlideover', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        USlideover: USlideoverStub,
        UForm: UFormStub,
        USelectMenu: USelectMenuStub,
        USelect: USelectStub,
        UButton: UButtonStub,
        UFormField: { template: '<div><slot /></div>' }
      }
    }
  }

  const mockCohorts = [{ id: 'c-1', name: 'Cohort A' }]
  const mockAccounts = [{ id: 'u-1', login: 'Student One' }]

  beforeEach(() => {
    vi.clearAllMocks()
    fetchCohortsMock.mockResolvedValue({ data: ref({ data: mockCohorts }), pending: ref(false) })
    fetchAccountsMock.mockResolvedValue({ data: ref({ data: mockAccounts }), pending: ref(false) })
  })

  it('should open empty in Create mode', async () => {
    const wrapper = await mountSuspended(EnrollmentSlideover, {
      ...defaultMocks,
      props: { modelValue: true, enrollmentId: null }
    })

    expect(wrapper.find('[data-testid="title"]').text()).toContain('pages.teaching.enrollments.create-title')

    const selects = wrapper.findAllComponents(USelectMenuStub)
    expect(selects[0]!.props('modelValue')).toBe('')
    expect(selects[1]!.props('modelValue')).toBe('')
  })

  it('should prepopulate cohort if initialCohortId is provided', async () => {
    const wrapper = await mountSuspended(EnrollmentSlideover, {
      ...defaultMocks,
      props: { modelValue: true, enrollmentId: null, initialCohortId: 'c-1' }
    })

    const selects = wrapper.findAllComponents(USelectMenuStub)
    expect(selects[0]!.props('modelValue')).toBe('c-1')
    expect(selects[0]!.props('disabled')).toBe(true)
  })

  it('should load data in Edit mode', async () => {
    fetchEnrollmentMock.mockResolvedValue({
      id: 'e-1',
      ownerId: 'u-1',
      cohortId: 'c-1',
      status: EnrollmentStatus.Completed
    })

    const wrapper = await mountSuspended(EnrollmentSlideover, {
      ...defaultMocks,
      props: { modelValue: false, enrollmentId: 'e-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchEnrollmentMock).toHaveBeenCalledWith('e-1')

    const selects = wrapper.findAllComponents(USelectMenuStub)
    expect(selects[0]!.props('modelValue')).toBe('c-1')
    expect(selects[1]!.props('modelValue')).toBe('u-1')

    const statusSelect = wrapper.findComponent(USelectStub)
    expect(statusSelect.props('modelValue')).toBe(EnrollmentStatus.Completed)
  })

  it('should call createEnrollment on submit', async () => {
    const wrapper = await mountSuspended(EnrollmentSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })

    const selects = wrapper.findAllComponents(USelectMenuStub)

    await selects[0]!.trigger('click')
    await selects[1]!.trigger('click')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createEnrollmentMock).toHaveBeenCalledWith(expect.objectContaining({
      cohortId: 'c-1',
      ownerId: 'u-1',
      status: EnrollmentStatus.Active
    }))
  })

  it('should call updateEnrollment on submit (Edit Mode)', async () => {
    fetchEnrollmentMock.mockResolvedValue({
      id: 'e-1',
      ownerId: 'u-1',
      cohortId: 'c-1',
      status: EnrollmentStatus.Active
    })

    const wrapper = await mountSuspended(EnrollmentSlideover, {
      ...defaultMocks,
      props: { modelValue: false, enrollmentId: 'e-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const statusSelect = wrapper.findComponent(USelectStub)
    statusSelect.vm.$emit('update:modelValue', EnrollmentStatus.Expelled)

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateEnrollmentMock).toHaveBeenCalledWith('e-1', {
      status: EnrollmentStatus.Expelled
    })
  })
})
