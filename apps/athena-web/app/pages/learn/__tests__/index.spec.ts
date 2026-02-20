import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LearnDashboardPage from '../index.vue'
import { ref } from 'vue'
import { ProgressStatus } from '@athena/types'

vi.mock('@athena/types', () => ({
  ProgressStatus: {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED'
  }
}))

const { fetchMyDashboardMock } = vi.hoisted(() => ({
  fetchMyDashboardMock: vi.fn()
}))

vi.mock('~/composables/useLearning', () => ({
  useLearning: () => ({
    fetchMyDashboard: fetchMyDashboardMock
  })
}))

const { useAsyncDataMock } = vi.hoisted(() => ({
  useAsyncDataMock: vi.fn()
}))
mockNuxtImport('useAsyncData', () => useAsyncDataMock)

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

const UDashboardPageStub = { template: '<div data-testid="page"><slot /></div>' }
const UDashboardPanelStub = { template: '<div data-testid="panel"><slot /></div>' }
const UDashboardNavbarStub = { template: '<div data-testid="navbar">{{ title }}</div>', props: ['title'] }
const UDashboardPanelContentStub = { template: '<div data-testid="content"><slot /></div>' }
const UCardStub = { template: '<div class="u-card" data-testid="card"><slot /><slot name="footer" /></div>' }
const UIconStub = { template: '<span :data-name="name" class="u-icon"></span>', props: ['name'] }
const UBadgeStub = { template: '<span class="u-badge" :data-color="color">{{ label }}<slot /></span>', props: ['label', 'color'] }
const UMeterStub = { template: '<div class="u-meter" :data-value="value"></div>', props: ['value'] }
const UButtonStub = { template: '<a :href="to" class="u-button" :data-label="label">{{ label }}</a>', props: ['to', 'label', 'icon', 'color'] }

const mockCourses = [
  {
    courseId: 'c1',
    courseTitle: 'Rust Basics',
    cohortName: 'Winter Cohort',
    instructorName: 'John Doe',
    progressPercentage: 0,
    totalScore: 0,
    status: ProgressStatus.NOT_STARTED,
    courseCoverUrl: 'http://example.com/cover.jpg'
  },
  {
    courseId: 'c2',
    courseTitle: 'Advanced Elixir',
    cohortName: 'Spring Cohort',
    instructorName: 'Jane Smith',
    progressPercentage: 45,
    totalScore: 120,
    status: ProgressStatus.IN_PROGRESS
  },
  {
    courseId: 'c3',
    courseTitle: 'Mastering Nuxt',
    cohortName: 'Fall Cohort',
    instructorName: 'Evan You',
    progressPercentage: 100,
    totalScore: 500,
    status: ProgressStatus.COMPLETED
  }
]

describe('Learn Dashboard Page (index.vue)', () => {
  const defaultMocks = {
    global: {
      mocks: {
        $t: (key: string) => key
      },
      stubs: {
        UDashboardPage: UDashboardPageStub,
        UDashboardPanel: UDashboardPanelStub,
        UDashboardNavbar: UDashboardNavbarStub,
        UDashboardPanelContent: UDashboardPanelContentStub,
        UCard: UCardStub,
        UIcon: UIconStub,
        UBadge: UBadgeStub,
        UMeter: UMeterStub,
        UButton: UButtonStub
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    useAsyncDataMock.mockResolvedValue({
      data: ref(mockCourses),
      pending: ref(false),
      error: ref(null)
    })
  })

  it('should render loading state when pending is true', async () => {
    useAsyncDataMock.mockResolvedValue({
      data: ref(null),
      pending: ref(true),
      error: ref(null)
    })

    const wrapper = await mountSuspended(LearnDashboardPage, defaultMocks)

    expect(wrapper.find('[data-name="i-lucide-loader-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card"]').exists()).toBe(false)
  })

  it('should render error state when error is present', async () => {
    useAsyncDataMock.mockResolvedValue({
      data: ref(null),
      pending: ref(false),
      error: ref(new Error('Network Error'))
    })

    const wrapper = await mountSuspended(LearnDashboardPage, defaultMocks)

    expect(wrapper.find('[data-name="i-lucide-alert-circle"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('common.error')
  })

  it('should render empty state when no courses are returned', async () => {
    useAsyncDataMock.mockResolvedValue({
      data: ref([]),
      pending: ref(false),
      error: ref(null)
    })

    const wrapper = await mountSuspended(LearnDashboardPage, defaultMocks)

    expect(wrapper.find('[data-name="i-lucide-book-dashed"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('pages.learn.no-courses')
  })

  it('should render list of courses correctly', async () => {
    const wrapper = await mountSuspended(LearnDashboardPage, defaultMocks)

    const cards = wrapper.findAllComponents(UCardStub)
    expect(cards).toHaveLength(3)
    expect(wrapper.text()).toContain('Rust Basics')
    expect(wrapper.text()).toContain('Winter Cohort')
    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.find('img[src="http://example.com/cover.jpg"]').exists()).toBe(true)

    const fallbackIcons = wrapper.findAll('[data-name="i-lucide-book-open"]')
    expect(fallbackIcons.length).toBeGreaterThan(0)
  })

  it('should compute correct status colors and labels', async () => {
    const wrapper = await mountSuspended(LearnDashboardPage, defaultMocks)

    const badges = wrapper.findAllComponents(UBadgeStub)

    expect(badges[0]!.text()).toContain('course-statuses.not-started')
    expect(badges[0]!.props('color')).toBe('neutral')
    expect(badges[1]!.text()).toContain('course-statuses.in-progress')
    expect(badges[1]!.props('color')).toBe('primary')
    expect(badges[2]!.text()).toContain('course-statuses.completed')
    expect(badges[2]!.props('color')).toBe('success')
  })

  it('should render correct button labels and actions based on progress', async () => {
    const wrapper = await mountSuspended(LearnDashboardPage, defaultMocks)

    const buttons = wrapper.findAllComponents(UButtonStub)

    expect(buttons[0]!.props('label')).toBe('pages.learn.start')
    expect(buttons[0]!.props('to')).toBe('/learn/courses/c1')
    expect(buttons[1]!.props('label')).toBe('pages.learn.continue')
    expect(buttons[1]!.props('to')).toBe('/learn/courses/c2')
    expect(buttons[2]!.props('label')).toBe('pages.learn.review')
    expect(buttons[2]!.props('to')).toBe('/learn/courses/c3')
  })
})
