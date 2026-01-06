import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StudioInspectorText from '~/components/studio/inspector/Text.vue'

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

describe('StudioInspectorText.vue', () => {
  it('should render the info alert', () => {
    const wrapper = mount(StudioInspectorText, {
      global: {
        mocks: { $t: tMock },
        stubs: {
          UAlert: {
            template: '<div class="alert-stub">{{ title }} - {{ description }}</div>',
            props: ['title', 'description']
          }
        }
      }
    })

    const alert = wrapper.find('.alert-stub')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('pages.studio.builder.inspector.blocks.text.title')
    expect(alert.text()).toContain('pages.studio.builder.inspector.blocks.text.description')
  })
})
