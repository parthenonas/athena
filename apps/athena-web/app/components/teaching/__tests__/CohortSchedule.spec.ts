import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CohortSchedule from '../CohortSchedule.vue'

const {
  mockState,
  fetchLessonsMock,
  fetchAllSchedulesMock,
  deleteScheduleMock,
  refreshLessonsMock,
  refreshSchedulesMock
} = vi.hoisted(() => ({
  mockState: {
    lessons: [] as any[],
    schedules: [] as any[]
  },
  fetchLessonsMock: vi.fn(),
  fetchAllSchedulesMock: vi.fn(),
  deleteScheduleMock: vi.fn(),
  refreshLessonsMock: vi.fn(),
  refreshSchedulesMock: vi.fn()
}))

mockNuxtImport('useStudio', async () => {
  const { ref } = await import('vue')
  return () => ({
    fetchLessons: (params: any) => {
      fetchLessonsMock(params)
      return {
        data: ref({
          data: mockState.lessons,
          meta: { total: mockState.lessons.length }
        }),
        status: ref('success'),
        refresh: refreshLessonsMock
      }
    }
  })
})

mockNuxtImport('useTeaching', () => {
  return () => ({
    fetchAllSchedules: fetchAllSchedulesMock,
    deleteSchedule: deleteScheduleMock,
    fetchSchedule: vi.fn()
  })
})

mockNuxtImport('useAppDate', () => {
  return () => ({
    formatDate: (date: any) => `Formatted ${date}`
  })
})

mockNuxtImport('useAsyncData', async () => {
  const { ref } = await import('vue')
  return (key: string, handler: any) => {
    handler()
    return Promise.resolve({
      data: ref(mockState.schedules),
      status: ref('success'),
      refresh: refreshSchedulesMock,
      error: ref(null)
    })
  }
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (k: string) => k
  })
})

const UTableStub = {
  name: 'UTable',
  props: ['data', 'columns'],
  template: `
    <table>
      <tbody>
        <tr v-for="row in data" :key="row.id">
          <td class="lesson-col"><slot name="lesson-title-cell" :row="{ original: row }" /></td>
          <td class="dates-col"><slot name="dates-cell" :row="{ original: row }" /></td>
          <td class="actions-col"><slot name="actions-cell" :row="{ original: row }" /></td>
        </tr>
      </tbody>
    </table>
  `
}

const SlideoverStub = {
  name: 'TeachingScheduleSlideover',
  props: ['modelValue', 'scheduleId', 'lessonId'],
  emits: ['update:modelValue', 'success'],
  template: '<div data-testid="slideover"></div>'
}

const ConfirmModalStub = {
  name: 'ConfirmModal',
  props: ['open'],
  emits: ['update:open', 'confirm'],
  template: '<div data-testid="confirm-modal"></div>'
}

const UButtonStub = {
  name: 'UButton',
  props: ['icon', 'label'],
  template: '<button class="u-button" @click="$emit(\'click\')">{{ icon }}</button>',
  emits: ['click']
}

describe('CohortSchedule Component', () => {
  const defaultProps = {
    cohort: { id: 'cohort-1', courseId: 'course-1', name: 'Test Cohort' }
  }

  const defaultMocks = {
    global: {
      mocks: {
        $t: (k: string) => k
      },
      stubs: {
        UTable: UTableStub,
        TeachingScheduleSlideover: SlideoverStub,
        ConfirmModal: ConfirmModalStub,
        UButton: UButtonStub,
        UInput: { template: '<input @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue'] },
        UPagination: { template: '<div></div>' },
        UIcon: { template: '<i></i>' },
        UBadge: { template: '<span></span>' },
        UTooltip: { template: '<div><slot /></div>' }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    deleteScheduleMock.mockResolvedValue(true)

    mockState.lessons = [
      { id: 'l1', title: 'Lesson 1' },
      { id: 'l2', title: 'Lesson 2' }
    ]
    mockState.schedules = [
      { id: 's1', lessonId: 'l1', startAt: '2025-01-01', isOpenManually: false }
    ]
  })

  it('should render merged data correctly', async () => {
    const wrapper = await mountSuspended(CohortSchedule, { ...defaultMocks, props: defaultProps as any })
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tr')
    expect(rows).toHaveLength(2)

    expect(rows[0]!.text()).toContain('Lesson 1')
    expect(rows[0]!.text()).toContain('Formatted 2025-01-01')

    expect(rows[1]!.text()).toContain('Lesson 2')
    expect(rows[1]!.text()).toContain('pages.teaching.schedule.not-scheduled')
  })

  it('should open slideover for CREATING a schedule', async () => {
    const wrapper = await mountSuspended(CohortSchedule, { ...defaultMocks, props: defaultProps as any })
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tr')
    const createBtn = rows[1]!.findComponent(UButtonStub)

    await createBtn.vm.$emit('click')

    const slideover = wrapper.findComponent(SlideoverStub)
    expect(slideover.exists()).toBe(true)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('lessonId')).toBe('l2')
    expect(slideover.props('scheduleId')).toBeNull()
  })

  it('should open slideover for EDITING a schedule', async () => {
    const wrapper = await mountSuspended(CohortSchedule, { ...defaultMocks, props: defaultProps as any })
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tr')
    const buttons = rows[0]!.findAllComponents(UButtonStub)
    const editBtn = buttons.find((b: any) => b.props('icon') === 'i-lucide-pencil')

    await editBtn?.vm.$emit('click')

    const slideover = wrapper.findComponent(SlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('scheduleId')).toBe('s1')
  })

  it('should refresh schedules on slideover success', async () => {
    const wrapper = await mountSuspended(CohortSchedule, { ...defaultMocks, props: defaultProps as any })
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tr')
    const createBtn = rows[1]!.findComponent(UButtonStub)
    await createBtn.vm.$emit('click')

    const slideover = wrapper.findComponent(SlideoverStub)
    await slideover.vm.$emit('success')

    expect(refreshSchedulesMock).toHaveBeenCalled()
  })

  it('should open confirm modal for DELETING a schedule', async () => {
    const wrapper = await mountSuspended(CohortSchedule, { ...defaultMocks, props: defaultProps as any })
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tr')
    const buttons = rows[0]!.findAllComponents(UButtonStub)
    const deleteBtn = buttons.find((b: any) => b.props('icon') === 'i-lucide-trash')

    await deleteBtn?.vm.$emit('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.props('open')).toBe(true)
  })

  it('should call API and refresh on DELETE confirm', async () => {
    const wrapper = await mountSuspended(CohortSchedule, { ...defaultMocks, props: defaultProps as any })
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tr')
    const deleteBtn = rows[0]!.findAllComponents(UButtonStub).find((b: any) => b.props('icon') === 'i-lucide-trash')
    await deleteBtn?.vm.$emit('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    await modal.vm.$emit('confirm')

    await new Promise(process.nextTick)
    await wrapper.vm.$nextTick()

    expect(deleteScheduleMock).toHaveBeenCalledWith('s1')
    expect(refreshSchedulesMock).toHaveBeenCalled()
    expect(modal.props('open')).toBe(false)
  })
})
