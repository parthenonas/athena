import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TextBlock from '../Text.vue'
import { defineComponent } from 'vue'

const CommonEditorStub = defineComponent({
  name: 'CommonEditor',
  props: ['modelValue', 'readOnly'],
  emits: ['update:modelValue', 'change', 'focus', 'blur'],
  template: '<div data-testid="common-editor"></div>'
})

describe('StudioBlocksText', () => {
  const defaultModelValue = {
    json: { type: 'doc', content: [] }
  }

  const defaultMocks = {
    global: {
      stubs: {

        CommonEditor: CommonEditorStub
      }
    }
  }

  it('should render correctly and passes props to CommonEditor', async () => {
    const wrapper = await mountSuspended(TextBlock, {
      ...defaultMocks,
      props: {
        modelValue: defaultModelValue,
        readOnly: true
      }
    })

    const editor = wrapper.findComponent(CommonEditorStub)

    expect(editor.exists()).toBe(true)

    expect(editor.props('modelValue')).toEqual(defaultModelValue.json)
    expect(editor.props('readOnly')).toBe(true)
  })

  it('should emit update:modelValue with correct structure when editor updates', async () => {
    const wrapper = await mountSuspended(TextBlock, {
      ...defaultMocks,
      props: {
        modelValue: defaultModelValue,
        readOnly: false
      }
    })

    const editor = wrapper.findComponent(CommonEditorStub)
    const newJson = { type: 'doc', content: [{ type: 'text', text: 'New content' }] }

    await editor.vm.$emit('update:modelValue', newJson)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{
      json: newJson
    }])
  })

  it('should propagate editor events (change, focus, blur)', async () => {
    const wrapper = await mountSuspended(TextBlock, {
      ...defaultMocks,
      props: { modelValue: defaultModelValue }
    })

    const editor = wrapper.findComponent(CommonEditorStub)

    await editor.vm.$emit('change')
    await editor.vm.$emit('focus')
    await editor.vm.$emit('blur')

    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('focus')).toBeTruthy()
    expect(wrapper.emitted('blur')).toBeTruthy()
  })

  it('should handle undefined json gracefully (default value)', async () => {
    const wrapper = await mountSuspended(TextBlock, {
      ...defaultMocks,
      props: {
        // @ts-expect-error: testing wrong data
        modelValue: { json: undefined }
      }
    })

    const editor = wrapper.findComponent(CommonEditorStub)
    expect(editor.props('modelValue')).toBeUndefined()
  })
})
