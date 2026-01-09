import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CoursesPage from '../index.vue'
import { nextTick, defineComponent } from 'vue'

const { fetchCoursesMock, deleteCourseMock, refreshMock, mockPush } = vi.hoisted(() => ({
  fetchCoursesMock: vi.fn(),
  deleteCourseMock: vi.fn(),
  refreshMock: vi.fn(),
  mockPush: vi.fn()
}))

mockNuxtImport('useRouter', () => {
  return () => ({
    push: mockPush,
    replace: vi.fn()
  })
})

vi.mock('~/composables/useStudio', () => ({
  useStudio: () => ({
    fetchCourses: fetchCoursesMock,
    deleteCourse: deleteCourseMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k })
}))

const UInputStub = defineComponent({
  name: 'UInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
})

const UTableStub = defineComponent({
  name: 'UTable',
  props: ['data', 'columns'],
  template: `
    <table>
      <tbody>
        <tr v-for="(row, index) in data" :key="index">
          <td class="title-cell">
            <slot name="title-cell" :row="{ original: row }" />
          </td>
          <td>
            <slot name="actions-cell" :row="{ original: row }" />
          </td>
        </tr>
      </tbody>
    </table>
  `
})

const StudioCourseSlideoverStub = defineComponent({
  name: 'StudioCourseSlideover',
  template: '<div data-testid="slideover" />',
  props: ['modelValue', 'course'],
  emits: ['update:modelValue', 'success']
})

const ConfirmModalStub = defineComponent({
  name: 'ConfirmModal',
  template: '<div data-testid="confirm-modal" />',
  props: ['open', 'loading'],
  emits: ['update:open', 'confirm']
})

const UButtonStub = defineComponent({
  name: 'UButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template: `<button @click="$emit('click')">{{ label }}</button>`
})

const UBadgeStub = defineComponent({ name: 'UBadge', template: '<span><slot /></span>' })
const UTooltipStub = defineComponent({ name: 'UTooltip', template: '<div><slot /></div>' })
const UPaginationStub = defineComponent({ name: 'UPagination', template: '<nav />' })

const mockCourses = [
  { id: '1', title: 'Vue Masterclass', createdAt: new Date().toISOString(), isPublished: false, tags: ['vue'] },
  { id: '2', title: 'React Basics', createdAt: new Date().toISOString(), isPublished: true, tags: ['react'] }
]

describe('Course Manager Page', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (k: string) => k },
      stubs: {
        UTable: UTableStub,
        StudioCourseSlideover: StudioCourseSlideoverStub,
        ConfirmModal: ConfirmModalStub,
        UButton: UButtonStub,
        UInput: UInputStub,
        UBadge: UBadgeStub,
        UTooltip: UTooltipStub,
        UPagination: UPaginationStub
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    fetchCoursesMock.mockResolvedValue({
      data: { value: { data: mockCourses, meta: { total: 2 } } },
      status: { value: 'success' },
      refresh: refreshMock
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render and load data', async () => {
    const wrapper = await mountSuspended(CoursesPage, defaultMocks)

    expect(fetchCoursesMock).toHaveBeenCalled()

    expect(wrapper.text()).toContain('pages.courses.title')

    const table = wrapper.findComponent(UTableStub)
    expect(table.exists()).toBe(true)
    expect(table.findAll('tr').length).toBe(2)
  })

  it('should open Slideover for create course', async () => {
    const wrapper = await mountSuspended(CoursesPage, defaultMocks)

    const createButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.courses.create')

    expect(createButton).toBeDefined()
    await createButton?.trigger('click')

    const slideover = wrapper.findComponent(StudioCourseSlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('course')).toBeNull()
  })

  it('should open Slideover for edit course', async () => {
    const wrapper = await mountSuspended(CoursesPage, defaultMocks)

    const editButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-pencil')

    await editButton?.trigger('click')

    const slideover = wrapper.findComponent(StudioCourseSlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('course')).toEqual(mockCourses[0])
  })

  it('should open ConfirmModal for delete course', async () => {
    const wrapper = await mountSuspended(CoursesPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')

    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.props('open')).toBe(true)
  })

  it('should call deleteCourse and refresh on confirm', async () => {
    const wrapper = await mountSuspended(CoursesPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')
    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    modal.vm.$emit('confirm')

    await nextTick()
    await vi.advanceTimersByTimeAsync(1)

    expect(deleteCourseMock).toHaveBeenCalledWith('1')
    expect(refreshMock).toHaveBeenCalled()
    expect(modal.props('open')).toBe(false)
  })

  it('should navigate to builder on title click', async () => {
    const wrapper = await mountSuspended(CoursesPage, defaultMocks)
    await nextTick()

    const titleCellDiv = wrapper.find('.title-cell div')

    expect(titleCellDiv.exists()).toBe(true)
    await titleCellDiv.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/studio/courses/1')
  })

  it('should update filters with debounce when searching', async () => {
    const wrapper = await mountSuspended(CoursesPage, defaultMocks)
    const input = wrapper.findComponent(UInputStub)

    await input.find('input').setValue('advanced')

    expect((wrapper.vm as any).search).toBe('advanced')
    expect((wrapper.vm as any).filters.search).toBe('')

    vi.advanceTimersByTime(500)

    expect((wrapper.vm as any).filters.search).toBe('advanced')
  })
})
