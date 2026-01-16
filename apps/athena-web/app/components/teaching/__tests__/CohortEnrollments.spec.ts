import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EnrollmentsList from '../CohortEnrollments.vue'
import { nextTick } from 'vue'
import { EnrollmentStatus } from '@athena/types'

const { fetchEnrollmentsMock, deleteEnrollmentMock, refreshMock } = vi.hoisted(() => ({
  fetchEnrollmentsMock: vi.fn(),
  deleteEnrollmentMock: vi.fn(),
  refreshMock: vi.fn()
}))

vi.mock('~/composables/useTeaching', () => ({
  useTeaching: () => ({
    fetchEnrollments: fetchEnrollmentsMock,
    deleteEnrollment: deleteEnrollmentMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const UInputStub = {
  name: 'UInput',
  props: ['modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
}

const UTableStub = {
  name: 'UTable',
  props: ['data', 'columns'],
  template: `
    <table>
      <tbody>
        <tr v-for="(row, index) in data" :key="index">
          <td><slot name="student-cell" :row="{ original: row }" /></td>
          <td><slot name="status-cell" :row="{ original: row }" /></td>
          <td><slot name="createdAt-cell" :row="{ original: row }" /></td>
          <td><slot name="actions-cell" :row="{ original: row }" /></td>
        </tr>
      </tbody>
    </table>
  `
}

const SlideoverStub = {
  name: 'TeachingEnrollmentSlideover',
  template: '<div data-testid="slideover" />',
  props: ['modelValue', 'enrollmentId', 'initialCohortId'],
  emits: ['update:modelValue', 'success']
}

const ConfirmModalStub = {
  name: 'ConfirmModal',
  template: '<div data-testid="confirm-modal" />',
  props: ['open', 'loading'],
  emits: ['update:open', 'confirm']
}

const UButtonStub = {
  name: 'UButton',
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
  props: ['label', 'icon']
}

const mockEnrollments = [
  {
    id: 'e-1',
    ownerId: 'u-1',
    status: EnrollmentStatus.Active,
    enrolledAt: '2025-01-01T10:00:00Z',
    user: { login: 'Student 1' }
  },
  {
    id: 'e-2',
    ownerId: 'u-2',
    status: EnrollmentStatus.Expelled,
    enrolledAt: '2025-02-01T10:00:00Z',
    user: { login: 'Student 2' }
  }
]

describe('Teaching Cohort Enrollments List', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        UTable: UTableStub,
        TeachingEnrollmentSlideover: SlideoverStub,
        ConfirmModal: ConfirmModalStub,
        UButton: UButtonStub,
        UInput: UInputStub,
        TeachingAccountBadge: { template: '<div>badge</div>' },
        UBadge: { template: '<span>badge</span>' },
        UPagination: true,
        UTooltip: { template: '<div><slot /></div>' }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    fetchEnrollmentsMock.mockResolvedValue({
      data: { value: { data: mockEnrollments, meta: { total: 2 } } },
      status: { value: 'success' },
      refresh: refreshMock
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render table and load data with cohortId filter', async () => {
    const wrapper = await mountSuspended(EnrollmentsList, {
      ...defaultMocks,
      props: { cohortId: 'cohort-123' }
    })

    expect(fetchEnrollmentsMock).toHaveBeenCalledWith(expect.objectContaining({
      cohortId: 'cohort-123',
      page: 1
    }))

    const table = wrapper.findComponent(UTableStub)
    expect(table.exists()).toBe(true)
    expect(table.findAll('tr').length).toBe(2)
  })

  it('should handle search with debounce', async () => {
    const wrapper = await mountSuspended(EnrollmentsList, {
      ...defaultMocks,
      props: { cohortId: 'cohort-123' }
    })

    const input = wrapper.findComponent(UInputStub)
    await input.find('input').setValue('student_login')

    expect((wrapper.vm as any).search).toBe('student_login')
    expect((wrapper.vm as any).filters.search).toBeUndefined()

    vi.advanceTimersByTime(500)

    expect((wrapper.vm as any).filters.search).toBe('student_login')
    expect((wrapper.vm as any).filters.page).toBe(1)
  })

  it('should open Create Slideover with initialCohortId', async () => {
    const wrapper = await mountSuspended(EnrollmentsList, {
      ...defaultMocks,
      props: { cohortId: 'cohort-123' }
    })

    const createBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-user-plus')

    await createBtn?.trigger('click')

    expect((wrapper.vm as any).isSlideoverOpen).toBe(true)
    expect((wrapper.vm as any).selectedEnrollmentId).toBeNull()

    const slideover = wrapper.findComponent(SlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('initialCohortId')).toBe('cohort-123')
  })

  it('should open Edit Slideover with ID', async () => {
    const wrapper = await mountSuspended(EnrollmentsList, {
      ...defaultMocks,
      props: { cohortId: 'cohort-123' }
    })

    const editBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-pencil')

    await editBtn?.trigger('click')

    expect((wrapper.vm as any).isSlideoverOpen).toBe(true)
    expect((wrapper.vm as any).selectedEnrollmentId).toBe('e-1')

    const slideover = wrapper.findComponent(SlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('enrollmentId')).toBe('e-1')
  })

  it('should open Delete Modal and confirm deletion', async () => {
    const wrapper = await mountSuspended(EnrollmentsList, {
      ...defaultMocks,
      props: { cohortId: 'cohort-123' }
    })

    const deleteBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-user-minus')

    await deleteBtn?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.props('open')).toBe(true)

    modal.vm.$emit('confirm')
    await nextTick()
    await vi.advanceTimersByTimeAsync(1)

    expect(deleteEnrollmentMock).toHaveBeenCalledWith('e-1')
    expect(refreshMock).toHaveBeenCalled()
    expect(modal.props('open')).toBe(false)
  })
})
