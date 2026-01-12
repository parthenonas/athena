import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CohortSlideover from '../CohortSlideover.vue'
import { nextTick, ref } from 'vue'
import { CalendarDate } from '@internationalized/date'

const {
  fetchCohortMock,
  createCohortMock,
  updateCohortMock,
  fetchInstructorsMock
} = vi.hoisted(() => ({
  fetchCohortMock: vi.fn(),
  createCohortMock: vi.fn(),
  updateCohortMock: vi.fn(),
  fetchInstructorsMock: vi.fn()
}))

vi.mock('~/composables/useTeaching', () => ({
  useTeaching: () => ({
    fetchCohort: fetchCohortMock,
    createCohort: createCohortMock,
    updateCohort: updateCohortMock,
    fetchInstructors: fetchInstructorsMock
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

const UInputStub = {
  name: 'UInput',
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" class="u-input-stub" />`,
  props: ['modelValue'],
  emits: ['update:modelValue']
}

const UInputDateStub = {
  name: 'UInputDate',
  template: `<div class="u-input-date-stub" :data-granularity="granularity"></div>`,
  props: ['modelValue', 'granularity'],
  emits: ['update:modelValue']
}

const USelectMenuStub = {
  name: 'USelectMenu',
  template: `
    <div class="u-select-menu-stub" @click="emitChange">
       <div v-for="item in items" :key="item.id">{{ item.label }}</div>
    </div>
  `,
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  setup(props: any, { emit }: any) {
    return {
      emitChange: () => {
        if (props.items.length > 0) emit('update:modelValue', props.items[0].id)
      }
    }
  }
}

const UButtonStub = { name: 'UButton', template: '<button />' }

describe('CohortSlideover', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        USlideover: USlideoverStub,
        UForm: UFormStub,
        UInput: UInputStub,
        UInputDate: UInputDateStub,
        USelectMenu: USelectMenuStub,
        UButton: UButtonStub,
        UFormField: { template: '<div><slot /></div>' }
      }
    }
  }

  const mockInstructors = [
    { id: 'inst-1', title: 'Prof A', owner: { login: 'user_a' } },
    { id: 'inst-2', title: 'Prof B', owner: { login: 'user_b' } }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    fetchInstructorsMock.mockResolvedValue({
      data: ref({ data: mockInstructors }),
      pending: ref(false)
    })
  })

  it('should open empty in Create mode (without granularity="minute")', async () => {
    const wrapper = await mountSuspended(CohortSlideover, {
      ...defaultMocks,
      props: { modelValue: true, cohortId: null }
    })

    const dateInputs = wrapper.findAllComponents(UInputDateStub)
    expect(dateInputs[0]!.props('modelValue')).toBeUndefined()
    expect(dateInputs[0]!.props('granularity')).toBeUndefined()
  })

  it('should load data in Edit mode and convert types to CalendarDate', async () => {
    fetchCohortMock.mockResolvedValue({
      id: 'cohort-1',
      name: 'Spring 2025',
      instructorId: 'inst-1',
      startDate: '2025-01-01T14:30:00Z',
      endDate: '2025-06-01T18:00:00Z'
    })

    const wrapper = await mountSuspended(CohortSlideover, {
      ...defaultMocks,
      props: { modelValue: false, cohortId: 'cohort-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchCohortMock).toHaveBeenCalledWith('cohort-1')

    const dateInputs = wrapper.findAllComponents(UInputDateStub)

    const startDateProp = dateInputs[0]!.props('modelValue')

    expect(startDateProp).toBeDefined()
    expect(startDateProp.year).toBe(2025)
    expect(startDateProp.month).toBe(1)
    expect(startDateProp.day).toBe(1)
  })

  it('should call createCohort on submit with correct Date object (00:00:00)', async () => {
    const wrapper = await mountSuspended(CohortSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })

    const input = wrapper.findComponent(UInputStub)
    input.vm.$emit('update:modelValue', 'New Cohort')

    const dateInputs = wrapper.findAllComponents(UInputDateStub)

    const newDate = new CalendarDate(2026, 9, 1)
    dateInputs[0]!.vm.$emit('update:modelValue', newDate)

    const select = wrapper.findComponent(USelectMenuStub)
    select.vm.$emit('update:modelValue', 'inst-2')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createCohortMock).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Cohort',
      instructorId: 'inst-2',
      startDate: expect.any(Date)
    }))

    const callArgs = createCohortMock.mock.calls[0]![0]
    expect(callArgs.startDate.getFullYear()).toBe(2026)
    expect(callArgs.startDate.getMonth()).toBe(8)
    expect(callArgs.startDate.getDate()).toBe(1)
    expect(callArgs.startDate.getHours()).toBe(0)
  })
})
