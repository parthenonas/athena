import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InstructorsPage from '../index.vue'
import { nextTick } from 'vue'

const { fetchInstructorsMock, deleteInstructorMock, refreshMock } = vi.hoisted(() => ({
  fetchInstructorsMock: vi.fn(),
  deleteInstructorMock: vi.fn(),
  refreshMock: vi.fn()
}))

vi.mock('~/composables/useTeaching', () => ({
  useTeaching: () => ({
    fetchInstructors: fetchInstructorsMock,
    deleteInstructor: deleteInstructorMock
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
          <td>
             <slot name="user-cell" :row="{ original: row }" />
          </td>
          <td>
             <slot name="createdAt-cell" :row="{ original: row }" />
          </td>
          <td>
            <slot name="actions-cell" :row="{ original: row }" />
          </td>
        </tr>
      </tbody>
    </table>
  `
}

const TeachingAccountBadgeStub = {
  name: 'TeachingAccountBadge',
  template: '<div data-testid="account-badge">{{ accountId }}</div>',
  props: ['accountId']
}

const SlideoverStub = {
  name: 'TeachingInstructorSlideover',
  template: '<div data-testid="slideover" />',
  props: ['modelValue', 'instructorId']
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

const mockInstructors = [
  {
    id: 'inst_1',
    ownerId: 'acc_1',
    title: 'Senior Professor',
    bio: 'Physics expert',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'inst_2',
    ownerId: 'acc_2',
    title: 'Lab Assistant',
    bio: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

describe('Instructors Page', () => {
  const defaultMocks = {
    global: {
      mocks: {
        $t: (key: string) => key
      },
      stubs: {
        UTable: UTableStub,
        TeachingAccountBadge: TeachingAccountBadgeStub,
        ConfirmModal: ConfirmModalStub,
        TeachingInstructorSlideover: SlideoverStub,
        UButton: UButtonStub,
        UInput: UInputStub,
        UPagination: true,
        UTooltip: { template: '<div><slot /></div>' }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    fetchInstructorsMock.mockResolvedValue({
      data: { value: { data: mockInstructors, meta: { total: 2 } } },
      status: { value: 'success' },
      refresh: refreshMock
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render page title and table', async () => {
    const wrapper = await mountSuspended(InstructorsPage, defaultMocks)

    expect(fetchInstructorsMock).toHaveBeenCalled()
    expect(wrapper.text()).toContain('pages.teaching.instructors.title')

    const table = wrapper.findComponent(UTableStub)
    expect(table.exists()).toBe(true)
    expect(table.findAll('tr').length).toBe(2)
  })

  it('should render account badges in the table', async () => {
    const wrapper = await mountSuspended(InstructorsPage, defaultMocks)

    const badges = wrapper.findAllComponents(TeachingAccountBadgeStub)
    expect(badges.length).toBe(2)
    expect(badges[0]!.props('accountId')).toBe('acc_1')
    expect(badges[1]!.props('accountId')).toBe('acc_2')
  })

  it('should handle create button click', async () => {
    const wrapper = await mountSuspended(InstructorsPage, defaultMocks)

    const createButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.teaching.instructors.create')

    await createButton?.trigger('click')

    expect((wrapper.vm as any).isSlideoverOpen).toBe(true)
    expect((wrapper.vm as any).selectedInstructorId).toBeNull()

    const slideover = wrapper.findComponent(SlideoverStub)
    expect(slideover.exists()).toBe(true)
    expect(slideover.props('modelValue')).toBe(true)
  })

  it('should handle edit button click', async () => {
    const wrapper = await mountSuspended(InstructorsPage, defaultMocks)

    const editButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-pencil')

    await editButton?.trigger('click')

    expect((wrapper.vm as any).isSlideoverOpen).toBe(true)
    expect((wrapper.vm as any).selectedInstructorId).toBe('inst_1')
  })

  it('should open ConfirmModal for delete instructor', async () => {
    const wrapper = await mountSuspended(InstructorsPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')

    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.exists()).toBe(true)
    expect(modal.props('open')).toBe(true)
  })

  it('should call deleteInstructor and refresh on confirm', async () => {
    const wrapper = await mountSuspended(InstructorsPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')
    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    modal.vm.$emit('confirm')

    await nextTick()
    await vi.advanceTimersByTimeAsync(1)

    expect(deleteInstructorMock).toHaveBeenCalledWith('inst_1')
    expect(refreshMock).toHaveBeenCalled()
    expect(modal.props('open')).toBe(false)
  })

  it('should update filters with debounce when searching', async () => {
    const wrapper = await mountSuspended(InstructorsPage, defaultMocks)
    const input = wrapper.findComponent(UInputStub)

    await input.find('input').setValue('Professor')

    expect((wrapper.vm as any).search).toBe('Professor')
    expect((wrapper.vm as any).filters.search).toBe('')

    vi.advanceTimersByTime(500)

    expect((wrapper.vm as any).filters.search).toBe('Professor')
  })
})
