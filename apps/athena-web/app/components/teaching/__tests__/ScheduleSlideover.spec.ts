import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ScheduleSlideover from '../ScheduleSlideover.vue'
import { nextTick } from 'vue'

const {
  fetchScheduleMock,
  createScheduleMock,
  updateScheduleMock
} = vi.hoisted(() => ({
  fetchScheduleMock: vi.fn(),
  createScheduleMock: vi.fn(),
  updateScheduleMock: vi.fn()
}))

vi.mock('~/utils/dates', () => ({
  toCalendarDateTime: (val: any) => val,
  toNativeDate: (val: any) => val
}))

mockNuxtImport('useTeaching', () => {
  return () => ({
    fetchSchedule: fetchScheduleMock,
    createSchedule: createScheduleMock,
    updateSchedule: updateScheduleMock
  })
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (k: string) => k
  })
})

const USlideoverStub = {
  name: 'USlideover',
  props: ['open', 'title'],
  template: `
    <div v-if="open" data-testid="slideover">
      <h1>{{ title }}</h1>
      <slot name="body" />
      <slot name="footer" />
    </div>
  `
}

const UFormStub = {
  name: 'UForm',
  props: ['state', 'schema'],
  emits: ['submit'],
  template: `<form @submit.prevent="submit"><slot /></form>`,
  setup(props: any, { emit }: any) {
    return {
      submit: () => emit('submit', { data: props.state })
    }
  }
}

const UInputDateStub = {
  name: 'UInputDate',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <input 
      class="u-input-date-stub"
      :value="modelValue" 
      @input="$emit('update:modelValue', $event.target.value)" 
    />
  `
}

const UButtonStub = {
  name: 'UButton',
  props: ['label', 'type'],
  template: `<button @click="$emit('click')" :type="type">{{ label }}</button>`
}

describe('ScheduleSlideover', () => {
  const defaultProps = {
    modelValue: true,
    cohortId: 'cohort-1',
    lessonId: 'lesson-1',
    lessonTitle: 'Intro to Vue',
    scheduleId: null as string | null
  }

  const defaultMocks = {
    global: {
      mocks: {
        $t: (key: string) => key
      },
      stubs: {
        USlideover: USlideoverStub,
        UForm: UFormStub,
        UInputDate: UInputDateStub,
        UButton: UButtonStub,
        UFormField: { template: '<div><slot /></div>' },
        UAlert: { template: '<div></div>' },
        USeparator: { template: '<hr />' },
        UIcon: { template: '<i></i>' }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correct title in CREATE mode', async () => {
    const wrapper = await mountSuspended(ScheduleSlideover, {
      ...defaultMocks,
      props: { ...defaultProps, scheduleId: null }
    })

    expect(wrapper.find('h1').text()).toBe('pages.teaching.schedule.create-title')
    expect(wrapper.findComponent(UInputDateStub).exists()).toBe(true)
  })

  it('should render correct title and load data in EDIT mode', async () => {
    fetchScheduleMock.mockResolvedValue({
      id: 'sched-1',
      startAt: '2025-01-01',
      endAt: '2025-02-01',
      isOpenManually: false
    })

    const wrapper = await mountSuspended(ScheduleSlideover, {
      ...defaultMocks,
      props: { ...defaultProps, modelValue: false, scheduleId: 'sched-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('h1').text()).toBe('pages.teaching.schedule.edit-title')

    const inputs = wrapper.findAllComponents(UInputDateStub)
    expect(inputs[0]!.props('modelValue')).toBe('2025-01-01')
    expect(inputs[1]!.props('modelValue')).toBe('2025-02-01')
  })

  it('should switch to MANUAL mode if loaded schedule says so', async () => {
    fetchScheduleMock.mockResolvedValue({
      id: 'sched-2',
      startAt: null,
      endAt: null,
      isOpenManually: true
    })

    const wrapper = await mountSuspended(ScheduleSlideover, {
      ...defaultMocks,
      props: { ...defaultProps, modelValue: false, scheduleId: 'sched-2' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.findComponent(UInputDateStub).exists()).toBe(false)
    expect(wrapper.text()).toContain('pages.teaching.schedule.full-access.title')
  })

  it('should call createSchedule with correct payload (Scheduled)', async () => {
    const wrapper = await mountSuspended(ScheduleSlideover, {
      ...defaultMocks,
      props: { ...defaultProps, scheduleId: null }
    })

    const inputs = wrapper.findAllComponents(UInputDateStub)
    await inputs[0]!.vm.$emit('update:modelValue', '2025-05-01')
    await inputs[1]!.vm.$emit('update:modelValue', '2025-06-01')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createScheduleMock).toHaveBeenCalledWith({
      cohortId: 'cohort-1',
      lessonId: 'lesson-1',
      isOpenManually: false,
      startAt: '2025-05-01',
      endAt: '2025-06-01'
    })

    expect(wrapper.emitted('success')).toBeTruthy()
  })

  it('should call updateSchedule with correct payload (Manual)', async () => {
    fetchScheduleMock.mockResolvedValue({
      id: 'sched-1',
      startAt: '2025-01-01',
      endAt: null,
      isOpenManually: false
    })

    const wrapper = await mountSuspended(ScheduleSlideover, {
      ...defaultMocks,
      props: { ...defaultProps, modelValue: false, scheduleId: 'sched-1' }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const options = wrapper.findAll('.cursor-pointer')
    await options[1]!.trigger('click')

    expect(wrapper.findComponent(UInputDateStub).exists()).toBe(false)

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateScheduleMock).toHaveBeenCalledWith('sched-1', {
      isOpenManually: true,
      startAt: null,
      endAt: null
    })
  })

  it('should handle clearing dates in Scheduled mode', async () => {
    const wrapper = await mountSuspended(ScheduleSlideover, {
      ...defaultMocks,
      props: { ...defaultProps }
    })

    const inputs = wrapper.findAllComponents(UInputDateStub)
    await inputs[0]!.vm.$emit('update:modelValue', '2025-10-10')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createScheduleMock).toHaveBeenCalledWith(expect.objectContaining({
      startAt: '2025-10-10',
      endAt: null
    }))
  })
})
