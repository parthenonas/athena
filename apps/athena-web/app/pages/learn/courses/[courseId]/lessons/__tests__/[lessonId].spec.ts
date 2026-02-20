import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LessonPlayerPage from '../[lessonId].vue'
import { ref } from 'vue'

const {
  fetchLessonMock,
  fetchMyProgressMock,
  markAsViewedMock,
  submitAssignmentMock,
  socketConnectMock,
  socketOnMock,
  pushMock,
  replaceMock,
  refreshLessonMock,
  refreshProgressMock,
  useRouteMock
} = vi.hoisted(() => ({
  fetchLessonMock: vi.fn(),
  fetchMyProgressMock: vi.fn(),
  markAsViewedMock: vi.fn(),
  submitAssignmentMock: vi.fn(),
  socketConnectMock: vi.fn(),
  socketOnMock: vi.fn(),
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshLessonMock: vi.fn(),
  refreshProgressMock: vi.fn(),
  useRouteMock: vi.fn(() => ({ params: { courseId: 'c1', lessonId: 'l1' } }))
}))

vi.mock('@athena/types', () => ({
  ProgrammingLanguage: { Python: 'python' },
  ProgressStatus: { COMPLETED: 'COMPLETED', IN_PROGRESS: 'IN_PROGRESS', LOCKED: 'LOCKED' },
  GradingStatus: { GRADED: 'GRADED', PENDING: 'PENDING' }
}))

mockNuxtImport('useRoute', () => useRouteMock)
mockNuxtImport('useRouter', () => () => ({ push: pushMock, replace: replaceMock }))

mockNuxtImport('useAsyncData', () => {
  return vi.fn(async (key: string, handler: () => any) => {
    const data = await handler()
    if (key.startsWith('lesson-')) {
      return { data: ref(data), pending: ref(false), refresh: refreshLessonMock }
    }
    if (key.startsWith('progress-')) {
      return { data: ref(data), pending: ref(false), refresh: refreshProgressMock }
    }
    return { data: ref(null), pending: ref(false), refresh: vi.fn() }
  })
})

vi.mock('~/composables/useLearning', () => ({
  useLearning: () => ({
    fetchLesson: fetchLessonMock,
    fetchMyProgress: fetchMyProgressMock,
    markAsViewed: markAsViewedMock,
    submitAssignment: submitAssignmentMock
  })
}))

vi.mock('~/stores/socket.store', () => ({
  useSocketStore: () => ({
    connect: socketConnectMock,
    socket: { on: socketOnMock },
    socketId: 'mock-socket-id'
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const UPageStub = { template: '<div data-testid="page"><slot name="left" /><slot /></div>' }
const UPageAsideStub = { template: '<div data-testid="aside"><slot /></div>' }
const UPageHeaderStub = { template: '<div data-testid="header">{{ title }}</div>', props: ['title'] }
const UPageBodyStub = { template: '<div data-testid="body"><slot /></div>' }
const UButtonStub = { template: '<button @click="$emit(\'click\')" :data-to="to">{{ label }}</button>', props: ['label', 'to', 'icon'] }
const UTooltipStub = { template: '<div data-testid="tooltip"><slot /></div>', props: ['text'] }
const UMeterStub = { template: '<div data-testid="meter" :data-value="value"></div>', props: ['value'] }
const UIconStub = { template: '<span :data-name="name" class="u-icon"></span>', props: ['name'] }

const LearnCourseSidebarStub = { template: '<div data-testid="course-sidebar" @click="$emit(\'select\', \'l2\')"></div>', props: ['courseProgress', 'activeLessonId'], emits: ['select'] }
const LearnBlockRendererStub = {
  template: '<div data-testid="block-renderer" @viewed="$emit(\'viewed\', block.blockId)" @submit="(payload) => $emit(\'submit\', block.blockId, payload)"></div>',
  props: ['block', 'isRunning', 'output'],
  emits: ['viewed', 'submit', 'run']
}

const mockProgress = {
  courseTitle: 'Test Course',
  progressPercentage: 50,
  lessons: {}
}

const mockLesson = {
  title: 'Test Lesson',
  goals: 'Learn testing',
  visibleBlocksCount: 1,
  totalBlocks: 2,
  blocks: [
    { blockId: 'b1', progress: { status: 'GRADED' } }
  ]
}

describe('Lesson Player Page ([lessonId].vue)', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        UPage: UPageStub,
        UPageAside: UPageAsideStub,
        UPageHeader: UPageHeaderStub,
        UPageBody: UPageBodyStub,
        UButton: UButtonStub,
        UTooltip: UTooltipStub,
        UMeter: UMeterStub,
        UIcon: UIconStub,
        LearnCourseSidebar: LearnCourseSidebarStub,
        LearnBlockRenderer: LearnBlockRendererStub
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchMyProgressMock.mockResolvedValue(mockProgress)
    fetchLessonMock.mockResolvedValue(mockLesson)
  })

  it('should render lesson and progress data correctly', async () => {
    const wrapper = await mountSuspended(LessonPlayerPage, defaultMocks)

    expect(wrapper.text()).toContain('Test Course')
    expect(wrapper.text()).toContain('50%')
    expect(wrapper.findComponent(LearnCourseSidebarStub).exists()).toBe(true)

    expect(wrapper.findComponent(UPageHeaderStub).props('title')).toBe('Test Lesson')
    expect(wrapper.text()).toContain('Learn testing')
    expect(wrapper.findAllComponents(LearnBlockRendererStub)).toHaveLength(1)
  })

  it('should handle block viewed event and refresh data', async () => {
    const wrapper = await mountSuspended(LessonPlayerPage, defaultMocks)

    const blockRenderer = wrapper.findComponent(LearnBlockRendererStub)
    await blockRenderer.vm.$emit('viewed', 'b1')

    expect(markAsViewedMock).toHaveBeenCalledWith('c1', 'l1', 'b1')
    expect(refreshLessonMock).toHaveBeenCalled()
    expect(refreshProgressMock).toHaveBeenCalled()
  })

  it('should handle block submit event and refresh data', async () => {
    const wrapper = await mountSuspended(LessonPlayerPage, defaultMocks)

    const blockRenderer = wrapper.findComponent(LearnBlockRendererStub)
    await blockRenderer.vm.$emit('submit', 'b1', { code: 'print("hello")' })

    expect(submitAssignmentMock).toHaveBeenCalledWith('c1', 'l1', 'b1', {
      code: 'print("hello")',
      language: 'python',
      socketId: 'mock-socket-id'
    })
    expect(refreshLessonMock).toHaveBeenCalled()
    expect(refreshProgressMock).toHaveBeenCalled()
  })

  it('should setup socket listener and refresh on specific execution_result', async () => {
    await mountSuspended(LessonPlayerPage, defaultMocks)

    expect(socketConnectMock).toHaveBeenCalled()
    expect(socketOnMock).toHaveBeenCalledWith('execution_result', expect.any(Function))

    const socketCallback = socketOnMock.mock.calls[0]![1]

    await socketCallback({ courseId: 'c2', lessonId: 'l1' })
    expect(refreshLessonMock).not.toHaveBeenCalled()

    await socketCallback({ courseId: 'c1', lessonId: 'l1' })
    expect(refreshLessonMock).toHaveBeenCalled()
    expect(refreshProgressMock).toHaveBeenCalled()
  })

  it('should show lesson completed banner when all blocks are graded', async () => {
    fetchLessonMock.mockResolvedValueOnce({
      ...mockLesson,
      visibleBlocksCount: 2,
      totalBlocks: 2,
      blocks: [
        { blockId: 'b1', progress: { status: 'GRADED' } },
        { blockId: 'b2', progress: { status: 'GRADED' } }
      ]
    })

    const wrapper = await mountSuspended(LessonPlayerPage, defaultMocks)

    expect(wrapper.text()).toContain('pages.learn.lesson-completed-title')
    expect(wrapper.text()).toContain('pages.learn.lesson-completed-desc')
  })

  it('should push to router on lesson select from sidebar', async () => {
    const wrapper = await mountSuspended(LessonPlayerPage, defaultMocks)

    const sidebar = wrapper.findComponent(LearnCourseSidebarStub)
    await sidebar.vm.$emit('select', 'l2')

    expect(pushMock).toHaveBeenCalledWith('/learn/courses/c1/lessons/l2')
  })
})
