import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BlockRenderer from '../BlockRenderer.vue'
import { BlockType, BlockRequiredAction, GradingStatus } from '@athena/types'

const mockStopIntersection = vi.fn()
let intersectionCallback: any = null

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useIntersectionObserver: vi.fn((target, callback) => {
      intersectionCallback = callback
      return { stop: mockStopIntersection }
    })
  }
})

const BlockTextStub = { template: '<div class="block-text-stub"></div>', props: ['content'] }
const BlockCodeStub = {
  template: '<div class="block-code-stub" @click="$emit(\'run\', \'test code\')"></div>',
  props: ['content', 'requiredAction', 'isCompleted', 'isRunning', 'output']
}
const UButtonStub = { template: '<button class="u-button-stub" @click="$emit(\'click\')">{{ label }}</button>', props: ['icon', 'label', 'disabled', 'loading', 'color', 'variant', 'size'] }
const UIconStub = { template: '<span class="u-icon-stub"></span>', props: ['name'] }

const tMock = (key: string, params?: any) => params ? `${key} ${JSON.stringify(params)}` : key

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const globalMountOptions = {
  mocks: { $t: tMock },
  stubs: {
    BlockText: BlockTextStub,
    BlockCode: BlockCodeStub,
    UButton: UButtonStub,
    UIcon: UIconStub
  }
}

describe('BlockRenderer.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    intersectionCallback = null
  })

  it('renders Text block correctly', () => {
    const block = {
      blockId: 'b1',
      type: BlockType.Text,
      requiredAction: BlockRequiredAction.VIEW,
      content: { json: {} }
    }

    const wrapper = mount(BlockRenderer, {
      props: { block: block as any },
      global: globalMountOptions
    })

    expect(wrapper.findComponent(BlockTextStub).exists()).toBe(true)
    expect(wrapper.findComponent(BlockCodeStub).exists()).toBe(false)
  })

  it('renders Code block correctly', () => {
    const block = {
      blockId: 'b2',
      type: BlockType.Code,
      requiredAction: BlockRequiredAction.SUBMIT,
      content: { language: 'python' }
    }

    const wrapper = mount(BlockRenderer, {
      props: { block: block as any },
      global: globalMountOptions
    })

    expect(wrapper.findComponent(BlockCodeStub).exists()).toBe(true)
    expect(wrapper.findComponent(BlockTextStub).exists()).toBe(false)
  })

  it('renders fallback for unknown block type', () => {
    const block = {
      blockId: 'b3',
      type: 'UNKNOWN_TYPE',
      requiredAction: BlockRequiredAction.VIEW,
      content: {}
    }

    const wrapper = mount(BlockRenderer, {
      props: { block: block as any },
      global: globalMountOptions
    })

    expect(wrapper.findComponent(BlockTextStub).exists()).toBe(false)
    expect(wrapper.findComponent(BlockCodeStub).exists()).toBe(false)
    expect(wrapper.text()).toContain('components.learn.block-renderer.unknown-type {"type":"UNKNOWN_TYPE"}')
  })

  it('emits "viewed" when an uncompleted VIEW block intersects the viewport', () => {
    const block = {
      blockId: 'b1',
      type: BlockType.Text,
      requiredAction: BlockRequiredAction.VIEW,
      progress: null
    }

    const wrapper = mount(BlockRenderer, {
      props: { block: block as any },
      global: globalMountOptions
    })

    expect(intersectionCallback).toBeDefined()

    intersectionCallback([{ isIntersecting: true }])

    expect(wrapper.emitted('viewed')).toBeTruthy()
    expect(wrapper.emitted('viewed')![0]).toEqual(['b1'])
    expect(mockStopIntersection).toHaveBeenCalled()
  })

  it('DOES NOT setup intersection observer if block is already completed', () => {
    const block = {
      blockId: 'b1',
      type: BlockType.Text,
      requiredAction: BlockRequiredAction.VIEW,
      progress: { status: GradingStatus.GRADED }
    }

    mount(BlockRenderer, {
      props: { block: block as any },
      global: globalMountOptions
    })

    expect(intersectionCallback).toBeNull()
  })

  it('renders INTERACT button and emits "viewed" on click', async () => {
    const block = {
      blockId: 'b1',
      type: BlockType.Text,
      requiredAction: BlockRequiredAction.INTERACT,
      progress: null,
      content: { json: {} }
    }

    const wrapper = mount(BlockRenderer, {
      props: { block: block as any },
      global: globalMountOptions
    })

    const interactBtn = wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'pages.learn.continue')
    expect(interactBtn).toBeDefined()

    await interactBtn!.trigger('click')

    expect(wrapper.emitted('viewed')).toBeTruthy()
    expect(wrapper.emitted('viewed')![0]).toEqual(['b1'])
  })

  it('disables INTERACT button if block is already completed', () => {
    const block = {
      blockId: 'b1',
      type: BlockType.Text,
      requiredAction: BlockRequiredAction.INTERACT,
      progress: { status: GradingStatus.GRADED },
      content: { json: {} }
    }

    const wrapper = mount(BlockRenderer, {
      props: { block: block as any },
      global: globalMountOptions
    })

    const interactBtn = wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'common.completed')
    expect(interactBtn).toBeDefined()
    expect(interactBtn!.props('disabled')).toBe(true)
  })

  it('forwards "run" and "submit" events from BlockCode', async () => {
    const block = {
      blockId: 'b1',
      type: BlockType.Code,
      requiredAction: BlockRequiredAction.SUBMIT,
      content: { language: 'python' }
    }

    const wrapper = mount(BlockRenderer, {
      props: { block: block as any },
      global: globalMountOptions
    })

    const blockCode = wrapper.findComponent(BlockCodeStub)

    blockCode.vm.$emit('run', 'print(1)')
    blockCode.vm.$emit('submit', { code: 'print(1)' })

    expect(wrapper.emitted('run')).toBeTruthy()
    expect(wrapper.emitted('run')![0]).toEqual(['b1', 'print(1)'])

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0]).toEqual(['b1', { code: 'print(1)' }])
  })
})
