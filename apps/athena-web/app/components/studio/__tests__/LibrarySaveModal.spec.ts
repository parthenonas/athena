import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LibrarySaveModal from '../LibrarySaveModal.vue'

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const UButtonStub = {
  name: 'UButton',
  template: '<button class="u-button-stub" :type="type || \'button\'" @click="$emit(\'click\')">{{ label || \'icon-btn\' }}</button>',
  props: ['label', 'icon', 'type', 'loading']
}

const UInputTagsStub = {
  name: 'UInputTags',
  template: '<div class="u-input-tags-stub"></div>',
  props: ['modelValue'],
  emits: ['update:modelValue']
}

const UFormStub = {
  name: 'UForm',
  template: '<form @submit.prevent="$emit(\'submit\', { data: state })"><slot /></form>',
  props: ['schema', 'state'],
  emits: ['submit']
}

const globalMountOptions = {
  mocks: { $t: tMock },
  stubs: {
    UModal: {
      template: '<div v-if="open" data-testid="modal-wrapper"><slot name="content" /></div>',
      props: ['open'],
      emits: ['update:open']
    },
    UForm: UFormStub,
    UFormField: { template: '<div><slot /></div>' },
    UInputTags: UInputTagsStub,
    UButton: UButtonStub
  }
}

describe('LibrarySaveModal.vue', () => {
  it('should clear tags when opened', async () => {
    const wrapper = mount(LibrarySaveModal, {
      props: { modelValue: false },
      global: globalMountOptions
    })

    const vm = wrapper.vm as any
    vm.state.tags = ['old_tag']

    await wrapper.setProps({ modelValue: true })

    expect(vm.state.tags).toEqual([])
  })

  it('should emit update:modelValue(false) when clicking cancel button', async () => {
    const wrapper = mount(LibrarySaveModal, {
      props: { modelValue: true },
      global: globalMountOptions
    })

    const cancelBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'common.cancel')

    await cancelBtn?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('should emit save event with tags on form submit', async () => {
    const wrapper = mount(LibrarySaveModal, {
      props: { modelValue: true },
      global: globalMountOptions
    })

    const vm = wrapper.vm as any
    vm.state.tags = ['new_tag1', 'new_tag2']

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')![0]).toEqual([['new_tag1', 'new_tag2']])
  })
})
