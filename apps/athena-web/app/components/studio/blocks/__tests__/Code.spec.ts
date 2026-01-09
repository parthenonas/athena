import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StudioBlocksCode from '../Code.vue'
import { CodeExecutionMode, ProgrammingLanguage, type CodeBlockContent } from '@athena/types'

const CommonCodeEditorStub = {
  template: '<textarea class="editor-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'language', 'readOnly']
}

const UTabsStub = {
  template: '<div class="tabs-stub"><div v-for="item in items" :key="item.value" @click="$emit(\'update:modelValue\', item.value)">{{ item.label }}</div></div>',
  props: ['items', 'modelValue']
}

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const globalMountOptions = {
  mocks: {
    $t: tMock,
    t: tMock
  },
  stubs: {
    CommonCodeEditor: CommonCodeEditorStub,
    UTabs: UTabsStub,
    CommonEditor: true,
    UBadge: true,
    UButton: true,
    UIcon: true,
    UAlert: true
  }
}

describe('StudioBlocksCode.vue', () => {
  const defaultContent: CodeBlockContent = {
    language: ProgrammingLanguage.Python,
    taskText: { json: {} },
    initialCode: 'print("Hello")',
    executionMode: CodeExecutionMode.IoCheck,
    inputData: '',
    outputData: '',
    testCasesCode: '',
    timeLimit: 1000,
    memoryLimit: 128
  }

  it('IO Mode: should NOT render tabs (only 1 item implies no tabs UI)', () => {
    const wrapper = mount(StudioBlocksCode, {
      props: {
        modelValue: defaultContent,
        readOnly: false
      },
      global: globalMountOptions
    })

    expect(wrapper.findComponent(UTabsStub).exists()).toBe(false)

    const editors = wrapper.findAllComponents(CommonCodeEditorStub)
    expect(editors.length).toBe(1)
    expect(editors[0]!.props('modelValue')).toBe('print("Hello")')
  })

  it('Unit Test Mode: should render 3 tabs (Solution, Tests, Setup)', async () => {
    const unitContent = { ...defaultContent, executionMode: CodeExecutionMode.UnitTest }

    const wrapper = mount(StudioBlocksCode, {
      props: {
        modelValue: unitContent,
        readOnly: false
      },
      global: globalMountOptions
    })

    const tabs = wrapper.findComponent(UTabsStub)
    expect(tabs.exists()).toBe(true)

    const items = tabs.props('items')
    expect(items).toHaveLength(3)
    expect(items[0].label).toBe('blocks.code.tabs.solution')
    expect(items[1].label).toBe('blocks.code.tabs.tests')
    expect(items[2].label).toBe('blocks.code.tabs.setup')
  })

  it('Unit Test Mode: Switching tabs should show correct editors', async () => {
    const unitContent = {
      ...defaultContent,
      executionMode: CodeExecutionMode.UnitTest,
      testCasesCode: 'assert True',
      inputData: '# setup script'
    }

    const wrapper = mount(StudioBlocksCode, {
      props: { modelValue: unitContent },
      global: globalMountOptions
    })

    const visibleEditor = wrapper.find('.editor-stub')
    expect((visibleEditor.element as any).value).toBe('print("Hello")')

    await wrapper.findComponent(UTabsStub).vm.$emit('update:modelValue', 1)

    const editors = wrapper.findAllComponents(CommonCodeEditorStub)

    expect(editors[1]!.props('modelValue')).toBe('assert True')

    await wrapper.findComponent(UTabsStub).vm.$emit('update:modelValue', 2)
    expect(editors[2]!.props('modelValue')).toBe('# setup script')
  })

  it('should emit "run" event with current code', async () => {
    const wrapper = mount(StudioBlocksCode, {
      props: { modelValue: defaultContent },
      global: globalMountOptions
    })

    const runBtn = wrapper.findComponent({ name: 'UButton' })

    await runBtn.vm.$emit('click')

    expect(wrapper.emitted('run')).toBeTruthy()
    expect(wrapper.emitted('run')![0]).toEqual(['print("Hello")'])
  })

  it('should update modelValue when code changes', async () => {
    const wrapper = mount(StudioBlocksCode, {
      props: { modelValue: defaultContent },
      global: globalMountOptions
    })

    const editor = wrapper.findComponent(CommonCodeEditorStub)
    await editor.vm.$emit('update:modelValue', 'new code')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emittedPayload = wrapper.emitted('update:modelValue')![0]![0] as CodeBlockContent
    expect(emittedPayload.initialCode).toBe('new code')
  })
})
