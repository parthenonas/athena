import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BlockCode from '../Code.vue'
import { BlockRequiredAction, CodeExecutionMode, ProgrammingLanguage, type CodeBlockContent } from '@athena/types'
import { nextTick } from 'vue'

const CommonEditorStub = { template: '<div class="common-editor-stub"></div>', props: ['modelValue', 'readOnly'] }
const CommonCodeEditorStub = {
  template: '<div class="common-code-editor-stub"></div>',
  props: ['modelValue', 'language', 'readOnly']
}
const UButtonStub = {
  template: '<button class="u-button-stub" @click="$emit(\'click\')">{{ label }}</button>',
  props: ['icon', 'label', 'disabled', 'loading']
}
const UIconStub = { template: '<span class="u-icon-stub"></span>', props: ['name'] }

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const globalMountOptions = {
  mocks: { $t: tMock },
  stubs: {
    CommonEditor: CommonEditorStub,
    CommonCodeEditor: CommonCodeEditorStub,
    UButton: UButtonStub,
    UIcon: UIconStub
  }
}

describe('BlockCode.vue', () => {
  const baseContent: CodeBlockContent = {
    language: ProgrammingLanguage.Python,
    initialCode: 'print("Hello")',
    executionMode: CodeExecutionMode.IoCheck,
    taskText: { json: {} }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders taskText if provided', () => {
    const content = { ...baseContent, taskText: { json: { doc: 'task' } } }
    const wrapper = mount(BlockCode, {
      props: { content, requiredAction: BlockRequiredAction.VIEW, isCompleted: false },
      global: globalMountOptions
    })

    const editor = wrapper.findComponent(CommonEditorStub)
    expect(editor.exists()).toBe(true)
    expect(editor.props('modelValue')).toEqual(content.taskText.json)
  })

  it('renders code editor with initial code and language', () => {
    const wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.VIEW, isCompleted: false },
      global: globalMountOptions
    })

    const codeEditor = wrapper.findComponent(CommonCodeEditorStub)
    expect(codeEditor.exists()).toBe(true)
    expect(codeEditor.props('language')).toBe(ProgrammingLanguage.Python)
    expect(codeEditor.props('modelValue')).toBe('print("Hello")')
    expect(codeEditor.props('readOnly')).toBe(false)
  })

  it('sets readOnly on code editor if isCompleted is true', () => {
    const wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.VIEW, isCompleted: true },
      global: globalMountOptions
    })

    const codeEditor = wrapper.findComponent(CommonCodeEditorStub)
    expect(codeEditor.props('readOnly')).toBe(true)
  })

  it('emits "run" event with current code when Run button is clicked', async () => {
    const wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.VIEW, isCompleted: false },
      global: globalMountOptions
    })

    const runBtn = wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'blocks.code.run')
    await runBtn!.trigger('click')

    expect(wrapper.emitted('run')).toBeTruthy()
    expect(wrapper.emitted('run')![0]).toEqual(['print("Hello")'])
  })

  it('shows Submit button ONLY if requiredAction is SUBMIT or PASS', () => {
    let wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.VIEW, isCompleted: false },
      global: globalMountOptions
    })
    expect(wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'common.submit')).toBeUndefined()

    wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.SUBMIT, isCompleted: false },
      global: globalMountOptions
    })
    expect(wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'common.submit')).toBeDefined()
  })

  it('disables Submit button if isCompleted is true', () => {
    const wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.SUBMIT, isCompleted: true },
      global: globalMountOptions
    })

    const submitBtn = wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'common.submit')
    expect(submitBtn!.props('disabled')).toBe(true)
  })

  it('emits "submit" event with current code when Submit button is clicked', async () => {
    const wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.SUBMIT, isCompleted: false },
      global: globalMountOptions
    })

    const submitBtn = wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'common.submit')
    await submitBtn!.trigger('click')

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0]).toEqual([{ code: 'print("Hello")' }])
  })

  it('updates local code when prop changes IF not completed', async () => {
    const wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.VIEW, isCompleted: false },
      global: globalMountOptions
    })

    await wrapper.setProps({ content: { ...baseContent, initialCode: 'print("Updated")' } })
    await nextTick()

    const codeEditor = wrapper.findComponent(CommonCodeEditorStub)
    expect(codeEditor.props('modelValue')).toBe('print("Updated")')
  })

  it('DOES NOT update local code when prop changes IF already completed', async () => {
    const wrapper = mount(BlockCode, {
      props: { content: baseContent, requiredAction: BlockRequiredAction.VIEW, isCompleted: true },
      global: globalMountOptions
    })

    await wrapper.setProps({ content: { ...baseContent, initialCode: 'print("Hacked")' } })
    await nextTick()

    const codeEditor = wrapper.findComponent(CommonCodeEditorStub)
    expect(codeEditor.props('modelValue')).toBe('print("Hello")')
  })
})
