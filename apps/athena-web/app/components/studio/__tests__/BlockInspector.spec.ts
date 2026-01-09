import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StudioBlockInspector from '../BlockInspector.vue'
import { BlockType, BlockRequiredAction, type BlockResponse, type BlockContent } from '@athena/types'

const InspectorStub = {
  template: '<div class="inspector-stub" @click="$emit(\'update\', { test: \'val\' })"></div>',
  props: ['content']
}

const UButtonStub = {
  name: 'UButton',
  template: '<button class="u-button-stub" @click="$emit(\'click\')">{{ label }}</button>',
  props: ['label', 'icon', 'color']
}

const USelectMenuStub = {
  template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"></select>',
  props: ['modelValue', 'options']
}

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const globalMountOptions = {
  mocks: { $t: tMock },
  stubs: {
    StudioInspectorCode: { ...InspectorStub, name: 'StudioInspectorCode' },
    StudioInspectorText: { ...InspectorStub, name: 'StudioInspectorText' },
    UButton: UButtonStub,
    USelectMenu: USelectMenuStub,
    UFormField: { template: '<div><slot /></div>' },
    UIcon: { template: '<i class="u-icon-stub" :class="name"></i>', props: ['name'] },
    USeparator: true
  }
}

describe('StudioBlockInspector.vue', () => {
  const baseBlock: BlockResponse & { content: BlockContent } = {
    id: 'block-1',
    lessonId: 'lesson-1',
    type: BlockType.Code,
    requiredAction: BlockRequiredAction.VIEW,
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    content: {
      language: 'python',
      initialCode: 'print(1)',
      taskText: { json: {} },
      executionMode: 'io_check'
    } as any
  }

  it('should render correct header icon and title for CODE block', () => {
    const wrapper = mount(StudioBlockInspector, {
      props: { block: baseBlock },
      global: globalMountOptions
    })

    const icon = wrapper.find('.u-icon-stub')
    expect(icon.classes()).toContain('i-lucide-code')

    expect(wrapper.text()).toContain('blocks.type.code')
  })

  it('should render correct header icon for TEXT block', () => {
    const textBlock = { ...baseBlock, type: BlockType.Text }
    const wrapper = mount(StudioBlockInspector, {
      props: { block: textBlock },
      global: globalMountOptions
    })

    const icon = wrapper.find('.u-icon-stub')
    expect(icon.classes()).toContain('i-lucide-align-left')
  })

  it('should render correct settings component based on type', () => {
    const wrapperCode = mount(StudioBlockInspector, {
      props: { block: baseBlock },
      global: globalMountOptions
    })
    expect(wrapperCode.findComponent({ name: 'StudioInspectorCode' }).exists()).toBe(true)
    expect(wrapperCode.findComponent({ name: 'StudioInspectorText' }).exists()).toBe(false)

    const textBlock = { ...baseBlock, type: BlockType.Text }
    const wrapperText = mount(StudioBlockInspector, {
      props: { block: textBlock },
      global: globalMountOptions
    })
    expect(wrapperText.findComponent({ name: 'StudioInspectorCode' }).exists()).toBe(false)
    expect(wrapperText.findComponent({ name: 'StudioInspectorText' }).exists()).toBe(true)
  })

  it('should show "no settings" message for unsupported types', () => {
    const weirdBlock = { ...baseBlock, type: 'unknown' as BlockType }

    const wrapper = mount(StudioBlockInspector, {
      props: { block: weirdBlock },
      global: globalMountOptions
    })

    expect(wrapper.text()).toContain('pages.studio.builder.inspector.no-settings')
  })

  it('should emit root update when Required Action changes', async () => {
    const wrapper = mount(StudioBlockInspector, {
      props: { block: baseBlock },
      global: globalMountOptions
    })

    const select = wrapper.findComponent(USelectMenuStub)
    await select.vm.$emit('update:modelValue', BlockRequiredAction.SUBMIT)

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0]).toEqual([
      baseBlock.id,
      { requiredAction: BlockRequiredAction.SUBMIT }
    ])
  })

  it('should handle CONTENT update with SINGLE key correctly', async () => {
    const wrapper = mount(StudioBlockInspector, {
      props: { block: baseBlock },
      global: globalMountOptions
    })

    const childInspector = wrapper.findComponent({ name: 'StudioInspectorCode' })

    await childInspector.vm.$emit('update', 'timeLimit', 5000)

    expect(wrapper.emitted('update')).toBeTruthy()
    const payload = wrapper.emitted('update')![0]![1] as any

    expect(payload.content).toEqual({
      ...baseBlock.content,
      timeLimit: 5000
    })
  })

  it('should handle CONTENT update with OBJECT payload correctly (Batch Update)', async () => {
    const wrapper = mount(StudioBlockInspector, {
      props: { block: baseBlock },
      global: globalMountOptions
    })

    const childInspector = wrapper.findComponent({ name: 'StudioInspectorCode' })

    await childInspector.vm.$emit('update', {
      executionMode: 'unit_test',
      inputData: 'new setup'
    })

    expect(wrapper.emitted('update')).toBeTruthy()
    const payload = wrapper.emitted('update')![0]![1] as any

    expect(payload.content).toEqual({
      ...baseBlock.content,
      executionMode: 'unit_test',
      inputData: 'new setup'
    })
  })

  it('should emit delete event when clicking trash button', async () => {
    const wrapper = mount(StudioBlockInspector, {
      props: { block: baseBlock },
      global: globalMountOptions
    })

    const deleteBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'common.delete')

    expect(deleteBtn).toBeDefined()
    await deleteBtn?.trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([baseBlock.id])
  })
})
