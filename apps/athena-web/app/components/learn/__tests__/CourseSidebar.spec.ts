import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CourseSidebar from '../CourseSidebar.vue'
import type { StudentDashboardResponse } from '~/composables/useLearning'
import { ProgressStatus } from '@athena/types'

const UIconStub = {
  name: 'UIcon',
  template: '<span class="u-icon-stub" :data-name="name"></span>',
  props: ['name']
}

const tMock = (key: string) => key

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const globalMountOptions = {
  mocks: {
    $t: tMock
  },
  stubs: {
    UIcon: UIconStub
  }
}

describe('CourseSidebar.vue', () => {
  const mockProgress: StudentDashboardResponse = {
    studentId: 's1',
    courseId: 'c1',
    courseTitle: 'Test Course',
    cohortName: 'Cohort 1',
    instructorName: 'Inst 1',
    progressPercentage: 50,
    totalScore: 100,
    status: ProgressStatus.IN_PROGRESS,
    recentBadges: [],
    lessons: {
      'lesson-1': { status: 'COMPLETED', completedBlocks: {} },
      'lesson-2': { status: 'IN_PROGRESS', completedBlocks: {} },
      'lesson-3': { status: 'LOCKED', completedBlocks: {} }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state when courseProgress is null', () => {
    const wrapper = mount(CourseSidebar, {
      props: { courseProgress: null, activeLessonId: null },
      global: globalMountOptions
    })

    expect(wrapper.find('[data-name="i-lucide-loader-2"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Lesson lesson-1')
  })

  it('should render lessons with correct statuses', () => {
    const wrapper = mount(CourseSidebar, {
      props: { courseProgress: mockProgress, activeLessonId: 'lesson-2' },
      global: globalMountOptions
    })

    const items = wrapper.findAll('.group')
    expect(items).toHaveLength(3)

    expect(items[0]!.find('[data-name="i-lucide-check-circle"]').exists()).toBe(true)

    expect(items[1]!.find('[data-name="i-lucide-circle"]').exists()).toBe(true)
    expect(items[1]!.find('[data-name="i-lucide-chevron-right"]').exists()).toBe(true)

    expect(items[2]!.find('[data-name="i-lucide-lock"]').exists()).toBe(true)
    expect(items[2]!.classes()).toContain('cursor-not-allowed')
  })

  it('should emit "select" when clicking an unlocked lesson', async () => {
    const wrapper = mount(CourseSidebar, {
      props: { courseProgress: mockProgress, activeLessonId: 'lesson-1' },
      global: globalMountOptions
    })

    const items = wrapper.findAll('.group')
    await items[1]!.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual(['lesson-2'])
  })

  it('should NOT emit "select" when clicking a locked lesson', async () => {
    const wrapper = mount(CourseSidebar, {
      props: { courseProgress: mockProgress, activeLessonId: 'lesson-1' },
      global: globalMountOptions
    })

    const items = wrapper.findAll('.group')
    await items[2]!.trigger('click')

    expect(wrapper.emitted('select')).toBeFalsy()
  })
})
