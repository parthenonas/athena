import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import LibraryPage from '../index.vue'
import { nextTick, defineComponent } from 'vue'
import { BlockType, Permission } from '@athena/types'
import { flushPromises } from '@vue/test-utils'

const { fetchLibraryBlocksMock, deleteLibraryBlockMock, createLibraryBlockMock, refreshMock, mockPush, canMock, mockToastAdd } = vi.hoisted(() => ({
  fetchLibraryBlocksMock: vi.fn(),
  deleteLibraryBlockMock: vi.fn(),
  createLibraryBlockMock: vi.fn(),
  refreshMock: vi.fn(),
  mockPush: vi.fn(),
  canMock: vi.fn().mockReturnValue(true),
  mockToastAdd: vi.fn()
}))

mockNuxtImport('useRouter', () => {
  return () => ({
    push: mockPush,
    replace: vi.fn()
  })
})

mockNuxtImport('useToast', () => {
  return () => ({
    add: mockToastAdd
  })
})

vi.mock('~/composables/useStudio', () => ({
  useStudio: () => ({
    fetchLibraryBlocks: fetchLibraryBlocksMock,
    deleteLibraryBlock: deleteLibraryBlockMock,
    createLibraryBlock: createLibraryBlockMock
  })
}))

vi.mock('~/composables/useAcl', () => ({
  useAcl: () => ({
    can: canMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k })
}))

const UFormStub = defineComponent({
  name: 'UForm',
  props: ['schema', 'state'],
  emits: ['submit'],
  template: `<form @submit.prevent="$emit('submit', { data: state })"><slot /></form>`
})

const UInputStub = defineComponent({
  name: 'UInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
})

const UInputTagsStub = defineComponent({
  name: 'UInputTags',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<div data-testid="input-tags"></div>`
})

const USelectMenuStub = defineComponent({
  name: 'USelectMenu',
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><slot /></select>`
})

const UTableStub = defineComponent({
  name: 'UTable',
  props: ['data', 'columns'],
  template: `
    <table>
      <tbody>
        <tr v-for="(row, index) in data" :key="index">
          <td>
            <slot name="actions-cell" :row="{ original: row }" />
          </td>
        </tr>
      </tbody>
    </table>
  `
})

const ConfirmModalStub = defineComponent({
  name: 'ConfirmModal',
  template: '<div data-testid="confirm-modal" />',
  props: ['open', 'loading'],
  emits: ['update:open', 'confirm']
})

const UButtonStub = defineComponent({
  name: 'UButton',
  props: ['label', 'icon', 'type'],
  emits: ['click'],
  template: `<button :type="type || 'button'" @click="$emit('click')">{{ label }}</button>`
})

const UBadgeStub = defineComponent({ name: 'UBadge', template: '<span><slot /></span>' })
const UTooltipStub = defineComponent({ name: 'UTooltip', template: '<div><slot /></div>' })
const UPaginationStub = defineComponent({ name: 'UPagination', template: '<nav />' })
const UFormFieldStub = defineComponent({ name: 'UFormField', template: '<div><slot /></div>' })

const mockTemplates = [
  { id: '1', type: BlockType.Text, tags: ['theory'], updatedAt: new Date().toISOString(), content: { json: { text: 'Text block' } } },
  { id: '2', type: BlockType.QuizQuestion, tags: ['practice'], updatedAt: new Date().toISOString(), content: { question: { json: { text: 'Quiz desc' } } } }
]

describe('Library Blocks Page', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (k: string) => k },
      stubs: {
        UTable: UTableStub,
        ConfirmModal: ConfirmModalStub,
        UButton: UButtonStub,
        UInput: UInputStub,
        UBadge: UBadgeStub,
        UTooltip: UTooltipStub,
        UPagination: UPaginationStub,
        UForm: UFormStub,
        UFormField: UFormFieldStub,
        USelectMenu: USelectMenuStub,
        UInputTags: UInputTagsStub
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    canMock.mockReturnValue(true)

    fetchLibraryBlocksMock.mockResolvedValue({
      data: { value: { data: mockTemplates, meta: { total: 2 } } },
      status: { value: 'success' },
      refresh: refreshMock
    })
  })

  it('should render and load data', async () => {
    const wrapper = await mountSuspended(LibraryPage, defaultMocks)

    expect(fetchLibraryBlocksMock).toHaveBeenCalled()
    expect(wrapper.text()).toContain('pages.library.title')

    const table = wrapper.findComponent(UTableStub)
    expect(table.exists()).toBe(true)
    expect(table.findAll('tr').length).toBe(2)
  })

  it('should navigate to create page on Create button click', async () => {
    const wrapper = await mountSuspended(LibraryPage, defaultMocks)

    const createButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.library.create')

    expect(createButton).toBeDefined()
    await createButton?.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/studio/library/create')
  })

  it('should navigate to edit page on Edit button click', async () => {
    const wrapper = await mountSuspended(LibraryPage, defaultMocks)

    const editButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-pencil')

    await editButton?.trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/studio/library/1')
  })

  it('should call createLibraryBlock and navigate to new block on Copy button click', async () => {
    const wrapper = await mountSuspended(LibraryPage, defaultMocks)

    createLibraryBlockMock.mockResolvedValueOnce({ id: 'new-copy-id' })

    const copyButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-copy')

    expect(copyButton).toBeDefined()
    await copyButton?.trigger('click')

    await flushPromises()

    expect(createLibraryBlockMock).toHaveBeenCalledWith({
      type: BlockType.Text,
      tags: ['theory'],
      content: { json: { text: 'Text block' } }
    })

    expect(mockToastAdd).toHaveBeenCalled()

    expect(mockPush).toHaveBeenCalledWith('/studio/library/new-copy-id')
  })

  it('should update filters on form submit', async () => {
    const wrapper = await mountSuspended(LibraryPage, defaultMocks)

    const vm = wrapper.vm as any
    vm.searchState.search = 'sql'
    vm.searchState.tags = ['hard']

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(vm.filters.search).toBe('sql')
    expect(vm.filters.tags).toEqual(['hard'])
    expect(vm.filters.page).toBe(1)
  })

  it('should reset filters on Reset button click', async () => {
    const wrapper = await mountSuspended(LibraryPage, defaultMocks)
    const vm = wrapper.vm as any

    vm.searchState.search = 'sql'
    vm.filters.search = 'sql'

    const resetButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-x')

    await resetButton?.trigger('click')

    expect(vm.searchState.search).toBe('')
    expect(vm.filters.search).toBeUndefined()
  })

  it('should open ConfirmModal for delete', async () => {
    const wrapper = await mountSuspended(LibraryPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')

    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.props('open')).toBe(true)
  })

  it('should call deleteLibraryBlock and refresh on confirm', async () => {
    const wrapper = await mountSuspended(LibraryPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')
    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    modal.vm.$emit('confirm')

    await flushPromises()
    await nextTick()

    expect(deleteLibraryBlockMock).toHaveBeenCalledWith('1')
    expect(refreshMock).toHaveBeenCalled()
    expect(modal.props('open')).toBe(false)
  })

  it('ACL: should hide Create button if user lacks LESSONS_CREATE permission', async () => {
    canMock.mockImplementation(perm => perm !== Permission.LESSONS_CREATE)

    const wrapper = await mountSuspended(LibraryPage, defaultMocks)

    const createButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.library.create')

    expect(createButton).toBeUndefined()
  })
})
