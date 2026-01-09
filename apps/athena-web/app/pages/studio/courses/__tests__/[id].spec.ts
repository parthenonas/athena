import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import LessonStudioPage from '../[id].vue'
import { defineComponent } from 'vue'
import { BlockType, CodeExecutionMode } from '@athena/types'
import { flushPromises } from '@vue/test-utils'

const {
  fetchAllLessonsMock, fetchBlocksMock, createBlockMock,
  updateBlockMock, deleteBlockMock, reorderBlockMock,
  updateLessonMock, deleteLessonMock, runBlockCodeMock
} = vi.hoisted(() => ({
  fetchAllLessonsMock: vi.fn(),
  fetchBlocksMock: vi.fn(),
  createBlockMock: vi.fn(),
  updateBlockMock: vi.fn(),
  deleteBlockMock: vi.fn(),
  reorderBlockMock: vi.fn(),
  updateLessonMock: vi.fn(),
  deleteLessonMock: vi.fn(),
  runBlockCodeMock: vi.fn()
}))

mockNuxtImport('useAsyncData', () => {
  return (key: string, handler: () => Promise<any>, options: any) => {
    const data = ref(null)

    const refresh = async () => {
      data.value = await handler()
    }
    refresh()

    if (options?.watch) {
      watch(options.watch, () => {
        refresh()
      })
    }

    return {
      data,
      refresh,
      pending: ref(false),
      error: ref(null)
    }
  }
})

mockNuxtImport('useStudio', () => {
  return () => ({
    fetchAllLessons: fetchAllLessonsMock,
    fetchBlocks: fetchBlocksMock,
    createBlock: createBlockMock,
    updateBlock: updateBlockMock,
    deleteBlock: deleteBlockMock,
    reorderBlock: reorderBlockMock,
    updateLesson: updateLessonMock,
    deleteLesson: deleteLessonMock,
    runBlockCode: runBlockCodeMock
  })
})

mockNuxtImport('useRoute', () => {
  return () => ({
    params: { id: 'course-1' }
  })
})

const socketConnectMock = vi.fn()
const socketOnMock = vi.fn()
const socketOffMock = vi.fn()

mockNuxtImport('useSocketStore', () => {
  return () => ({
    connect: socketConnectMock,
    on: socketOnMock,
    off: socketOffMock,
    socketId: 'sock-1'
  })
})

mockNuxtImport('useSubmissionParser', () => {
  return () => ({
    parseSubmission: () => ({ statusLabel: 'OK', formattedOutput: 'Done', isError: false })
  })
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: ref('en'), setLocale: vi.fn() })
}))

const StudioStructureSidebarStub = defineComponent({
  name: 'StudioStructureSidebar',
  template: '<div data-testid="sidebar" />',
  props: ['lessons', 'activeLessonId'],
  emits: ['update:activeLessonId', 'add']
})

const StudioCanvasStub = defineComponent({
  name: 'StudioCanvas',
  template: '<div data-testid="canvas" />',
  props: ['blocks', 'activeBlockId', 'executionStates'],
  emits: ['update:activeBlockId', 'add', 'delete', 'run']
})

const StudioBlockInspectorStub = defineComponent({
  name: 'StudioBlockInspector',
  template: '<div data-testid="block-inspector" />',
  props: ['block']
})

const StudioLessonInspectorStub = defineComponent({
  name: 'StudioLessonInspector',
  template: '<div data-testid="lesson-inspector" />',
  props: ['lesson']
})

const ConfirmModalStub = defineComponent({
  name: 'ConfirmModal',
  template: '<div />',
  props: ['open'],
  emits: ['confirm', 'update:open']
})

const StudioLessonModalStub = defineComponent({ name: 'StudioLessonModal', template: '<div />' })

describe('Lesson Studio Page', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (k: string) => k },
      stubs: {
        StudioStructureSidebar: StudioStructureSidebarStub,
        StudioCanvas: StudioCanvasStub,
        StudioBlockInspector: StudioBlockInspectorStub,
        StudioLessonInspector: StudioLessonInspectorStub,
        StudioLessonModal: StudioLessonModalStub,
        ConfirmModal: ConfirmModalStub,
        UDashboardGroup: { template: '<div><slot /></div>' },
        UDashboardPanel: { template: '<div><slot name="header"/><slot name="body"/></div>' },
        UDashboardNavbar: { template: '<div><slot name="right"/></div>' },
        UButton: true, UIcon: true, UTooltip: true, USeparator: true
      }
    }
  }

  const mockLessons = [
    { id: 'l1', title: 'L1', courseId: 'c1', orderIndex: 0 },
    { id: 'l2', title: 'L2', courseId: 'c1', orderIndex: 1 }
  ]
  const mockBlocks = [
    { id: 'b1', type: BlockType.Text, lessonId: 'l1' },
    { id: 'b2', type: BlockType.Code, lessonId: 'l1', content: { executionMode: CodeExecutionMode.IoCheck } }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    fetchAllLessonsMock.mockResolvedValue(mockLessons)
    fetchBlocksMock.mockResolvedValue(mockBlocks)
    createBlockMock.mockResolvedValue({ id: 'b3', type: BlockType.Text })
  })

  it('should fetch lessons and blocks on mount', async () => {
    await mountSuspended(LessonStudioPage, defaultMocks)

    expect(fetchAllLessonsMock).toHaveBeenCalledWith('course-1')
    expect(fetchBlocksMock).toHaveBeenCalledWith('l1')
  })

  it('should render Sidebar and Canvas', async () => {
    const wrapper = await mountSuspended(LessonStudioPage, defaultMocks)
    expect(wrapper.findComponent(StudioStructureSidebarStub).exists()).toBe(true)
    expect(wrapper.findComponent(StudioCanvasStub).exists()).toBe(true)
  })

  it('should fetch new blocks when switching lesson', async () => {
    const wrapper = await mountSuspended(LessonStudioPage, defaultMocks)

    const sidebar = wrapper.findComponent(StudioStructureSidebarStub)

    sidebar.vm.$emit('update:activeLessonId', 'l2')
    await flushPromises()

    expect(fetchBlocksMock).toHaveBeenCalledWith('l2')

    const canvas = wrapper.findComponent(StudioCanvasStub)
    expect(canvas.props('activeBlockId')).toBeNull()
  })

  it('should open Block Inspector when selecting a block', async () => {
    const wrapper = await mountSuspended(LessonStudioPage, defaultMocks)

    const canvas = wrapper.findComponent(StudioCanvasStub)
    canvas.vm.$emit('update:activeBlockId', 'b1')

    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(StudioBlockInspectorStub).exists()).toBe(true)
    expect(wrapper.findComponent(StudioLessonInspectorStub).exists()).toBe(false)
  })

  it('should add a block', async () => {
    const wrapper = await mountSuspended(LessonStudioPage, defaultMocks)

    const canvas = wrapper.findComponent(StudioCanvasStub)
    canvas.vm.$emit('add', BlockType.Text)

    await flushPromises()

    expect(createBlockMock).toHaveBeenCalledWith(expect.objectContaining({
      lessonId: 'l1',
      type: BlockType.Text
    }))

    expect(fetchBlocksMock).toHaveBeenCalledTimes(2)
  })

  it('should delete a block', async () => {
    const wrapper = await mountSuspended(LessonStudioPage, defaultMocks)

    const canvas = wrapper.findComponent(StudioCanvasStub)
    canvas.vm.$emit('delete', 'b1')
    await wrapper.vm.$nextTick()

    const modals = wrapper.findAllComponents(ConfirmModalStub)
    const deleteBlockModal = modals[1]

    deleteBlockModal!.vm.$emit('confirm')
    await wrapper.vm.$nextTick()

    expect(deleteBlockMock).toHaveBeenCalledWith('b1')
  })
})
