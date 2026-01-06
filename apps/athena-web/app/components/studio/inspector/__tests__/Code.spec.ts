import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StudioInspectorCode from '~/components/studio/inspector/Code.vue'
import { CodeExecutionMode, ProgrammingLanguage, type CodeBlockContent } from '@athena/types'

const UInputStub = {
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue']
}

const UTextareaStub = {
  template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue']
}

const USelectMenuStub = {
  template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="opt in items" :key="opt.value" :value="opt.value">{{ opt.label }}</option></select>',
  props: ['modelValue', 'items']
}

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const globalMountOptions = {
  mocks: {
    $t: tMock
  },
  stubs: {
    UInput: UInputStub,
    UTextarea: UTextareaStub,
    USelectMenu: USelectMenuStub,
    UFormField: { template: '<div><slot /></div>' },
    USeparator: true,
    UAlert: true
  }
}

describe('StudioInspectorCode.vue', () => {
  const defaultContent: CodeBlockContent = {
    language: ProgrammingLanguage.Python,
    taskText: { json: {} },
    initialCode: '',
    executionMode: CodeExecutionMode.IoCheck,
    inputData: 'io-input-data',
    outputData: 'expected-output',
    testCasesCode: '',
    timeLimit: 1000,
    memoryLimit: 128
  }

  it('should render correct fields for IO Check mode', () => {
    const wrapper = mount(StudioInspectorCode, {
      props: { content: defaultContent },
      global: globalMountOptions
    })

    const textareas = wrapper.findAllComponents(UTextareaStub)
    expect(textareas).toHaveLength(2)
    expect(textareas[0]!.props('modelValue')).toBe('io-input-data')
    expect(textareas[1]!.props('modelValue')).toBe('expected-output')

    const alert = wrapper.findComponent({ name: 'UAlert' })
    expect(alert.exists()).toBe(true)
  })

  it('should render correct fields for Unit Test mode', () => {
    const unitContent = { ...defaultContent, executionMode: CodeExecutionMode.UnitTest }
    const wrapper = mount(StudioInspectorCode, {
      props: { content: unitContent },
      global: globalMountOptions
    })

    const textareas = wrapper.findAllComponents(UTextareaStub)
    expect(textareas).toHaveLength(0)

    expect(wrapper.find('u-alert-stub').exists()).toBe(true)
  })

  it('should emit update when simple fields change', async () => {
    const wrapper = mount(StudioInspectorCode, {
      props: { content: defaultContent },
      global: globalMountOptions
    })

    const inputs = wrapper.findAllComponents(UInputStub)
    await inputs[0]!.vm.$emit('update:modelValue', '2000')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0]).toEqual(['timeLimit', 2000])
  })

  it('should cache inputData between mode switches (CRITICAL LOGIC)', async () => {
    const wrapper = mount(StudioInspectorCode, {
      props: {
        content: { ...defaultContent, inputData: 'io-data-1', executionMode: CodeExecutionMode.IoCheck }
      },
      global: globalMountOptions
    })

    const modeSelect = wrapper.findAllComponents(USelectMenuStub)[1]!

    await modeSelect.vm.$emit('update:modelValue', CodeExecutionMode.UnitTest)

    const emit1 = wrapper.emitted('update')![0]
    expect(emit1![0]).toEqual({
      executionMode: CodeExecutionMode.UnitTest,
      inputData: ''
    })

    await wrapper.setProps({
      content: {
        ...defaultContent,
        executionMode: CodeExecutionMode.UnitTest,
        inputData: 'unit-setup-1'
      }
    })

    await modeSelect.vm.$emit('update:modelValue', CodeExecutionMode.IoCheck)

    const emit2 = wrapper.emitted('update')![1]
    expect(emit2![0]).toEqual({
      executionMode: CodeExecutionMode.IoCheck,
      inputData: 'io-data-1'
    })
  })
})
