import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BlockText from '../Text.vue'
import type { TextBlockContent } from '@athena/types'

const CommonEditorStub = {
  template: '<div class="common-editor-stub"></div>',
  props: ['modelValue', 'readOnly']
}

const globalMountOptions = {
  stubs: {
    CommonEditor: CommonEditorStub
  }
}

describe('BlockText.vue', () => {
  it('should render CommonEditor with readOnly true and correct content', () => {
    const mockContent: TextBlockContent = {
      json: { type: 'doc', content: [{ type: 'paragraph', text: 'Hello student' }] }
    }

    const wrapper = mount(BlockText, {
      props: { content: mockContent },
      global: globalMountOptions
    })

    const editor = wrapper.findComponent(CommonEditorStub)
    expect(editor.exists()).toBe(true)
    expect(editor.props('readOnly')).toBe(true)
    expect(editor.props('modelValue')).toEqual(mockContent.json)
  })
})
