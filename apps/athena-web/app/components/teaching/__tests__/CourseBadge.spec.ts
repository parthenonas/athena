import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CourseBadge from '../CourseBadge.vue'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

const { mockUseAsyncData } = vi.hoisted(() => {
  return { mockUseAsyncData: vi.fn() }
})

mockNuxtImport('useStudio', () => {
  return () => ({ fetchCourse: vi.fn() })
})

mockNuxtImport('useAsyncData', () => {
  return mockUseAsyncData
})

const USkeletonStub = {
  name: 'USkeleton',
  template: `
    <div data-testid="skeleton" />
  `
}

const UButtonStub = { name: 'UButton', template: '<button data-testid="button"><slot /></button>' }

describe('CourseBadge', () => {
  const courseId = 'course-123'
  const courseTitle = 'Course Title'

  const defaultMocks = {
    global: {
      stubs: {
        USkeleton: USkeletonStub,
        UButton: UButtonStub
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show skeleton while pending request', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref(null),
      status: ref('pending'),
      refresh: vi.fn(),
      clear: vi.fn(),
      error: ref(null)
    })

    const wrapper = await mountSuspended(CourseBadge, {
      ...defaultMocks,
      props: { modelValue: true, courseId }
    })

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain(courseId)
  })

  it('show course id on error', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(new Error('Failed'))
    })

    const wrapper = await mountSuspended(CourseBadge, {
      ...defaultMocks,
      props: { modelValue: true, courseId }
    })

    await flushPromises()

    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UButton' }).exists()).toBe(false)
    expect(wrapper.text()).toContain(courseId)
  })

  it('should show button with course title on success', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref({ id: courseId, title: courseTitle }),
      status: ref('success')
    })

    const wrapper = await mountSuspended(CourseBadge, {
      ...defaultMocks,
      props: { modelValue: true, courseId }
    })

    await flushPromises()

    console.warn(wrapper.html())

    const btn = wrapper.find('[data-testid="button"]')
    expect(btn.exists()).toBe(true)

    expect(wrapper.text()).toContain(courseTitle)
  })
})
