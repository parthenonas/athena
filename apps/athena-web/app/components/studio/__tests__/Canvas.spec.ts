import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StudioCanvas from '../Canvas.vue'
import { BlockRequiredAction, BlockType, CodeExecutionMode, type BlockResponse, type CodeBlockResponse, type TextBlockResponse } from '@athena/types'

const StudioBlocksTextStub = {
  name: 'StudioBlocksText',
  template: '<div class="text-block-stub" @input="$emit(\'update:modelValue\', { json: {} })"></div>',
  props: ['modelValue', 'readOnly']
}

const StudioBlocksCodeStub = {
  name: 'StudioBlocksCode',
  template: `
    <div class="code-block-stub">
      <button class="run-btn" @click="$emit('run', 'print(1)')">Run</button>
      <input class="code-input" :value="modelValue?.initialCode" @input="$emit('update:modelValue', { ...modelValue, initialCode: $event.target.value })" />
    </div>
  `,
  props: ['modelValue', 'readOnly', 'isRunning', 'output']
}

const VueDraggableStub = {
  template: '<div class="draggable-stub"><slot /></div>',
  props: ['modelValue', 'animation', 'handle'],
  methods: {
    simulateEnd(evt: unknown) {
      (this as any).$emit('end', evt)
    }
  }
}

const UDropdownMenuStub = {
  template: '<div class="dropdown-stub"><slot /></div>',
  props: ['items']
}

const UButtonStub = {
  name: 'UButton',
  template: '<button class="add-btn-stub" @click="$emit(\'click\')"></button>',
  props: ['label', 'icon']
}

const StudioLibraryInsertSlideoverStub = {
  name: 'StudioLibraryInsertSlideover',
  template: '<div data-testid="library-slideover"></div>',
  props: ['modelValue'],
  emits: ['update:modelValue', 'insert']
}

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const globalMountOptions = {
  mocks: { $t: tMock },
  stubs: {
    VueDraggable: VueDraggableStub,
    StudioBlocksText: StudioBlocksTextStub,
    StudioBlocksCode: StudioBlocksCodeStub,
    UDropdownMenu: UDropdownMenuStub,
    UButton: UButtonStub,
    UIcon: { template: '<i class="icon-stub"></i>' }
  }
}

describe('StudioCanvas.vue', () => {
  const blocksMock: BlockResponse[] = [
    {
      id: 'b1',
      type: BlockType.Text,
      lessonId: 'l1',
      orderIndex: 0,
      requiredAction: BlockRequiredAction.VIEW,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: { json: { type: 'doc' } } as any
    } as TextBlockResponse,
    {
      id: 'b2',
      type: BlockType.Code,
      lessonId: 'l1',
      orderIndex: 1,
      requiredAction: BlockRequiredAction.SUBMIT,
      createdAt: new Date(),
      updatedAt: new Date(),
      content: {
        language: 'python',
        initialCode: 'print("hello")',
        executionMode: CodeExecutionMode.IoCheck
      }
    } as CodeBlockResponse
  ]

  it('should render loading spinner when loading is true', () => {
    const wrapper = mount(StudioCanvas, {
      props: {
        blocks: [],
        activeBlockId: null,
        loading: true
      },
      global: globalMountOptions
    })

    expect(wrapper.find('.draggable-stub').exists()).toBe(false)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('should render empty state when no blocks provided', () => {
    const wrapper = mount(StudioCanvas, {
      props: {
        blocks: [],
        activeBlockId: null,
        loading: false
      },
      global: globalMountOptions
    })

    expect(wrapper.text()).toContain('pages.studio.builder.no-blocks')
    expect(wrapper.find('.draggable-stub').exists()).toBe(false)
  })

  it('should render list of blocks correctly', () => {
    const wrapper = mount(StudioCanvas, {
      props: {
        blocks: blocksMock,
        activeBlockId: null
      },
      global: globalMountOptions
    })

    const items = wrapper.findAll('.group')
    expect(items).toHaveLength(2)

    expect(items[0]!.findComponent(StudioBlocksTextStub).exists()).toBe(true)

    expect(items[1]!.findComponent(StudioBlocksCodeStub).exists()).toBe(true)
  })

  it('should highlight active block and handle selection', async () => {
    const wrapper = mount(StudioCanvas, {
      props: {
        blocks: blocksMock,
        activeBlockId: 'b1'
      },
      global: globalMountOptions
    })

    const items = wrapper.findAll('.group')

    expect(items[0]!.classes()).toContain('ring-primary-500')
    expect(items[1]!.classes()).toContain('ring-transparent')
    await items[1]!.trigger('click')

    expect(wrapper.emitted('update:activeBlockId')).toBeTruthy()
    expect(wrapper.emitted('update:activeBlockId')![0]).toEqual(['b2'])
  })

  it('should deselect block when clicking background', async () => {
    const wrapper = mount(StudioCanvas, {
      props: {
        blocks: blocksMock,
        activeBlockId: 'b1'
      },
      global: globalMountOptions
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('update:activeBlockId')).toBeTruthy()
    expect(wrapper.emitted('update:activeBlockId')![0]).toEqual([null])
  })

  it('should emit "add" with correct type when selecting a standard block from dropdown', () => {
    const wrapper = mount(StudioCanvas, {
      props: { blocks: [], activeBlockId: null },
      global: globalMountOptions
    })

    const dropdown = wrapper.findComponent(UDropdownMenuStub)
    const items = dropdown.props('items') as any[][]

    const codeItem = items[0]!.find((i: any) => i.label === 'blocks.type.code')
    expect(codeItem).toBeDefined()

    codeItem.onSelect()

    expect(wrapper.emitted('add')).toBeTruthy()
    expect(wrapper.emitted('add')![0]).toEqual([BlockType.Code])
  })

  it('should open library slideover when selecting "From Library" from dropdown', async () => {
    const wrapper = mount(StudioCanvas, {
      props: { blocks: [], activeBlockId: null },
      global: globalMountOptions
    })

    const dropdown = wrapper.findComponent(UDropdownMenuStub)
    const items = dropdown.props('items') as any[][]

    const libraryItem = items[1]![0]
    expect(libraryItem.label).toBe('pages.studio.builder.from-library')

    libraryItem.onSelect()
    await wrapper.vm.$nextTick()

    const slideover = wrapper.findComponent(StudioLibraryInsertSlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
  })

  it('should emit "add" with type and prefilled content when slideover emits "insert"', async () => {
    const wrapper = mount(StudioCanvas, {
      props: { blocks: [], activeBlockId: null },
      global: globalMountOptions
    })

    const slideover = wrapper.findComponent(StudioLibraryInsertSlideoverStub)

    const fakeContent = { json: { text: 'library content' } }
    slideover.vm.$emit('insert', BlockType.Text, fakeContent)

    expect(wrapper.emitted('add')).toBeTruthy()
    expect(wrapper.emitted('add')![0]).toEqual([BlockType.Text, fakeContent])
  })

  it('should emit "reorder" when drag ends', () => {
    const wrapper = mount(StudioCanvas, {
      props: { blocks: blocksMock, activeBlockId: null },
      global: globalMountOptions
    })

    const draggable = wrapper.findComponent(VueDraggableStub)
    const event = { newIndex: 1, oldIndex: 0 }

    draggable.vm.simulateEnd(event)

    expect(wrapper.emitted('reorder')).toBeTruthy()
    expect(wrapper.emitted('reorder')![0]).toEqual([event])
  })

  it('should pass execution state and emit "run"', async () => {
    const executionStates = {
      b2: { isRunning: true, output: 'Hello World' }
    }

    const wrapper = mount(StudioCanvas, {
      props: {
        blocks: blocksMock,
        activeBlockId: null,
        executionStates
      },
      global: globalMountOptions
    })

    const codeBlock = wrapper.findComponent(StudioBlocksCodeStub)
    expect(codeBlock.props('isRunning')).toBe(true)
    expect(codeBlock.props('output')).toBe('Hello World')

    const runBtn = codeBlock.find('.run-btn')
    await runBtn.trigger('click')

    expect(wrapper.emitted('run')).toBeTruthy()
    expect(wrapper.emitted('run')![0]).toEqual(['b2', 'print(1)'])
  })

  it('should emit "update" when child component content changes', async () => {
    const wrapper = mount(StudioCanvas, {
      props: { blocks: blocksMock, activeBlockId: null },
      global: globalMountOptions
    })

    const codeBlock = wrapper.findComponent(StudioBlocksCodeStub)

    const input = codeBlock.find('input')
    await input.setValue('new_code()')

    expect(wrapper.emitted('update')).toBeTruthy()
    const emitArgs = wrapper.emitted('update')![0]
    expect(emitArgs![0]).toBe('b2')
    expect((emitArgs![1] as any).content.initialCode).toBe('new_code()')
  })
})
