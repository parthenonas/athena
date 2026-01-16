import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import InstructorBadge from '../InstructorBadge.vue'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

const { mockUseAsyncData } = vi.hoisted(() => {
  return { mockUseAsyncData: vi.fn() }
})

mockNuxtImport('useTeaching', () => {
  return () => ({ fetchInstructor: vi.fn() })
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

describe('InstructorBadge', () => {
  const instructorId = 'instructor-123'
  const instructorName = 'Super Admin'

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

    const wrapper = await mountSuspended(InstructorBadge, {
      ...defaultMocks,
      props: { modelValue: true, instructorId }
    })

    expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain(instructorId)
  })

  it('show instructor id on error', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(new Error('Failed'))
    })

    const wrapper = await mountSuspended(InstructorBadge, {
      ...defaultMocks,
      props: { modelValue: true, instructorId }
    })

    await flushPromises()

    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UButton' }).exists()).toBe(false)
    expect(wrapper.text()).toContain(instructorId)
  })

  it('should show button with instructor login on success', async () => {
    mockUseAsyncData.mockReturnValue({
      data: ref({ id: instructorId, title: instructorName }),
      status: ref('success')
    })

    const wrapper = await mountSuspended(InstructorBadge, {
      ...defaultMocks,
      props: { modelValue: true, instructorId }
    })

    await flushPromises()

    console.warn(wrapper.html())

    const btn = wrapper.find('[data-testid="button"]')
    expect(btn.exists()).toBe(true)

    expect(wrapper.text()).toContain(instructorName)
  })
})
