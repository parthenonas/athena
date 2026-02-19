import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import CourseRouterPage from '../index.vue'
import { ProgressStatus } from '@athena/types'

const mockCourseId = 'course-123'

const { navigateToMock, addToastMock, fetchMyProgressMock, useRouteMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  addToastMock: vi.fn(),
  fetchMyProgressMock: vi.fn(),
  useRouteMock: vi.fn(() => ({ params: { courseId: 'course-123' } }))
}))

mockNuxtImport('useRoute', () => useRouteMock)
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: addToastMock }))

vi.mock('~/composables/useLearning', () => ({
  useLearning: () => ({
    fetchMyProgress: fetchMyProgressMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const UIconStub = { template: '<span class="u-icon-stub"></span>' }

describe('Course Router Page ([courseId]/index.vue)', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { UIcon: UIconStub }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect to the IN_PROGRESS lesson', async () => {
    fetchMyProgressMock.mockResolvedValue({
      lessons: {
        'lesson-1': { status: ProgressStatus.COMPLETED },
        'lesson-2': { status: ProgressStatus.IN_PROGRESS },
        'lesson-3': { status: ProgressStatus.LOCKED }
      }
    })

    await mountSuspended(CourseRouterPage, defaultMocks)

    expect(fetchMyProgressMock).toHaveBeenCalledWith(mockCourseId)
    expect(navigateToMock).toHaveBeenCalledWith(`/learn/courses/${mockCourseId}/lessons/lesson-2`, { replace: true })
  })

  it('should redirect to the first lesson if no IN_PROGRESS lesson exists (e.g., all COMPLETED)', async () => {
    fetchMyProgressMock.mockResolvedValue({
      lessons: {
        'lesson-1': { status: ProgressStatus.COMPLETED },
        'lesson-2': { status: ProgressStatus.COMPLETED }
      }
    })

    await mountSuspended(CourseRouterPage, defaultMocks)

    expect(navigateToMock).toHaveBeenCalledWith(`/learn/courses/${mockCourseId}/lessons/lesson-1`, { replace: true })
  })

  it('should show error toast and redirect to /learn if progress fetch fails', async () => {
    fetchMyProgressMock.mockRejectedValue(new Error('Network Error'))

    await mountSuspended(CourseRouterPage, defaultMocks)

    expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
      color: 'error',
      title: 'common.error'
    }))
    expect(navigateToMock).toHaveBeenCalledWith('/learn', { replace: true })
  })

  it('should show error toast and redirect to /learn if no lessons exist in the course', async () => {
    fetchMyProgressMock.mockResolvedValue({
      lessons: {}
    })

    await mountSuspended(CourseRouterPage, defaultMocks)

    expect(addToastMock).toHaveBeenCalled()
    expect(navigateToMock).toHaveBeenCalledWith('/learn', { replace: true })
  })
})
