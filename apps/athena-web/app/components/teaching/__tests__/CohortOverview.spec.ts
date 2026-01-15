import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CohortOverview from '../CohortOverview.vue'
import { ref } from 'vue'

const {
  fetchInstructorMock,
  fetchEnrollmentsMock
} = vi.hoisted(() => ({
  fetchInstructorMock: vi.fn(),
  fetchEnrollmentsMock: vi.fn()
}))

vi.mock('~/composables/useTeaching', () => ({
  useTeaching: () => ({
    fetchInstructor: fetchInstructorMock,
    fetchEnrollments: fetchEnrollmentsMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const TeachingAccountBadgeStub = {
  name: 'TeachingAccountBadge',
  template: '<div data-testid="instructor-badge">{{ accountId }}</div>',
  props: ['accountId']
}

const UCardStub = {
  template: `
    <div class="u-card">
      <div class="header"><slot name="header" /></div>
      <div class="body"><slot /></div>
    </div>
  `
}

describe('Cohort Overview', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        UCard: UCardStub,
        UIcon: true,
        USkeleton: true,
        TeachingAccountBadge: TeachingAccountBadgeStub
      }
    }
  }

  const mockCohort = {
    id: 'c-1',
    name: 'Cohort 1',
    instructorId: 'inst-1',
    startDate: new Date(),
    endDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()

    fetchEnrollmentsMock.mockReturnValue({
      data: ref({ meta: { total: 42 } }),
      status: ref('success')
    })

    fetchInstructorMock.mockResolvedValue({
      id: 'inst-1',
      ownerId: 'u-123',
      title: 'Professor X'
    })
  })

  it('should render instructor, dates and stats correctly', async () => {
    const wrapper = await mountSuspended(CohortOverview, {
      ...defaultMocks,
      props: { cohort: mockCohort }
    })

    expect(fetchInstructorMock).toHaveBeenCalledWith('inst-1')

    const badge = wrapper.findComponent(TeachingAccountBadgeStub)
    expect(badge.exists()).toBe(true)
    expect(badge.props('accountId')).toBe('u-123')

    expect(wrapper.text()).toContain('42')
  })

  it('should display "not assigned" if no instructorId provided', async () => {
    const cohortNoInst = { ...mockCohort, id: 'c-no-inst', instructorId: null }

    const wrapper = await mountSuspended(CohortOverview, {
      ...defaultMocks,
      props: { cohort: cohortNoInst }
    })

    await wrapper.vm.$nextTick()

    expect(fetchInstructorMock).not.toHaveBeenCalled()
    expect(wrapper.findComponent(TeachingAccountBadgeStub).exists()).toBe(false)
    expect(wrapper.text()).toContain('pages.teaching.cohorts.overview.not-assigned')
  })

  it('should display "-" for missing dates', async () => {
    const cohortNoDates = {
      ...mockCohort,
      startDate: null,
      endDate: null
    }

    const wrapper = await mountSuspended(CohortOverview, {
      ...defaultMocks,
      props: { cohort: cohortNoDates }
    })

    const cards = wrapper.findAll('.u-card')
    const dateCardText = cards[1]!.text()

    expect(dateCardText).toContain('-')
    expect(dateCardText).not.toContain('2025')
  })

  it('should show 0 students if meta is missing', async () => {
    fetchEnrollmentsMock.mockReturnValue({
      data: ref(null),
      status: ref('pending')
    })

    const wrapper = await mountSuspended(CohortOverview, {
      ...defaultMocks,
      props: { cohort: mockCohort }
    })

    const cards = wrapper.findAll('.u-card')
    const statsCard = cards[2]!

    expect(statsCard.text()).toContain('0')
  })
})
