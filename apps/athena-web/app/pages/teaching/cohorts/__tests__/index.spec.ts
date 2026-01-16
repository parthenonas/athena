import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CohortsPage from '../index.vue'
import { nextTick } from 'vue'

const { fetchCohortsMock, deleteCohortMock, refreshMock } = vi.hoisted(() => ({
  fetchCohortsMock: vi.fn(),
  deleteCohortMock: vi.fn(),
  refreshMock: vi.fn()
}))

vi.mock('~/composables/useTeaching', () => ({
  useTeaching: () => ({
    fetchCohorts: fetchCohortsMock,
    deleteCohort: deleteCohortMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
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
          <td><slot name="name-cell" :row="{ original: row }" /></td>
          <td><slot name="instructor-cell" :row="{ original: row }" /></td>
          <td><slot name="dates-cell" :row="{ original: row }" /></td>
          <td><slot name="actions-cell" :row="{ original: row }" /></td>
        </tr>
      </tbody>
    </table>
  `
}

const TeachingInstructorBadgeStub = {
  name: 'TeachingInstructorBadge',
  template: '<div data-testid="instructor-badge">{{ instructorId }}</div>',
  props: ['instructorId']
}

const SlideoverStub = {
  name: 'TeachingCohortSlideover',
  template: '<div data-testid="slideover" />',
  props: ['modelValue', 'cohortId'],
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

const NuxtLinkStub = {
  name: 'NuxtLink',
  template: '<a><slot /></a>',
  props: ['to']
}

const mockCohorts = [
  {
    id: 'c-1',
    name: 'Spring 2025',
    instructorId: 'inst-1',
    startDate: '2025-01-01',
    endDate: '2025-06-01',
    createdAt: new Date().toISOString()
  },
  {
    id: 'c-2',
    name: 'Fall 2025',
    instructorId: 'inst-2',
    startDate: '2025-09-01',
    endDate: '2025-12-31',
    createdAt: new Date().toISOString()
  }
]

describe('Cohorts Page', () => {
  const defaultMocks = {
    global: {
      mocks: {
        $t: (key: string) => key
      },
      stubs: {
        UTable: UTableStub,
        TeachingCohortSlideover: SlideoverStub,
        TeachingInstructorBadge: TeachingInstructorBadgeStub,
        ConfirmModal: ConfirmModalStub,
        UButton: UButtonStub,
        UInput: UInputStub,
        NuxtLink: NuxtLinkStub,
        UPagination: true,
        UTooltip: { template: '<div><slot /></div>' },
        UAvatar: true
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    fetchCohortsMock.mockResolvedValue({
      data: { value: { data: mockCohorts, meta: { total: 2 } } },
      status: { value: 'success' },
      refresh: refreshMock
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render page title and load data', async () => {
    const wrapper = await mountSuspended(CohortsPage, defaultMocks)

    expect(fetchCohortsMock).toHaveBeenCalled()
    expect(wrapper.text()).toContain('pages.teaching.cohorts.title')

    const table = wrapper.findComponent(UTableStub)
    expect(table.exists()).toBe(true)
    expect(table.findAll('tr').length).toBe(2)
  })

  it('should handle create button click', async () => {
    const wrapper = await mountSuspended(CohortsPage, defaultMocks)

    const createButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.teaching.cohorts.create')

    await createButton?.trigger('click')

    expect((wrapper.vm as any).isSlideoverOpen).toBe(true)
    expect((wrapper.vm as any).selectedCohortId).toBeNull()

    const slideover = wrapper.findComponent(SlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
  })

  it('should handle edit button click', async () => {
    const wrapper = await mountSuspended(CohortsPage, defaultMocks)

    const editButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-pencil')

    await editButton?.trigger('click')

    expect((wrapper.vm as any).isSlideoverOpen).toBe(true)
    expect((wrapper.vm as any).selectedCohortId).toBe('c-1')

    const slideover = wrapper.findComponent(SlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('cohortId')).toBe('c-1')
  })

  it('should open ConfirmModal for delete cohort', async () => {
    const wrapper = await mountSuspended(CohortsPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')

    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.exists()).toBe(true)
    expect(modal.props('open')).toBe(true)
  })

  it('should call deleteCohort and refresh on confirm', async () => {
    const wrapper = await mountSuspended(CohortsPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')
    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    modal.vm.$emit('confirm')

    await nextTick()
    await vi.advanceTimersByTimeAsync(1)

    expect(deleteCohortMock).toHaveBeenCalledWith('c-1')
    expect(refreshMock).toHaveBeenCalled()
    expect(modal.props('open')).toBe(false)
  })

  it('should update filters with debounce when searching', async () => {
    const wrapper = await mountSuspended(CohortsPage, defaultMocks)
    const input = wrapper.findComponent(UInputStub)

    await input.find('input').setValue('Spring')

    expect((wrapper.vm as any).search).toBe('Spring')
    expect((wrapper.vm as any).filters.search).toBe('')

    vi.advanceTimersByTime(500)

    expect((wrapper.vm as any).filters.search).toBe('Spring')
  })
})
