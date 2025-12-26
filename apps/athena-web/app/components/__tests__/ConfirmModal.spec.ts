import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ConfirmModal from '../ConfirmModal.vue'

const UModalStub = {
  name: 'UModal',
  template: '<div><slot name="footer" /></div>',
  props: ['title', 'description', 'modelValue', 'open']
}

const UButtonStub = {
  name: 'UButton',
  template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
  props: ['label', 'color', 'loading']
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

describe('ConfirmModal', () => {
  const defaultMocks = {
    global: {
      mocks: {
        $t: (msg: string) => msg
      },
      stubs: {
        UModal: UModalStub,
        UButton: UButtonStub
      }
    }
  }

  it('renders with correct title and description passed to UModal', async () => {
    const wrapper = await mountSuspended(ConfirmModal, {
      ...defaultMocks,
      props: {
        open: true,
        title: 'Delete Role?',
        description: 'Are you sure?'
      }
    })

    const modal = wrapper.findComponent(UModalStub)

    expect(modal.exists()).toBe(true)
    expect(modal.props('title')).toBe('Delete Role?')
    expect(modal.props('description')).toBe('Are you sure?')
  })

  it('emits update:open false when Cancel is clicked', async () => {
    const wrapper = await mountSuspended(ConfirmModal, {
      ...defaultMocks,
      props: {
        open: true,
        title: 'Test',
        cancelLabel: 'Cancel'
      }
    })

    const buttons = wrapper.findAllComponents(UButtonStub)
    const cancelButton = buttons.find(b => b.text() === 'Cancel')

    expect(cancelButton?.exists()).toBe(true)

    await cancelButton?.trigger('click')

    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('emits confirm when Confirm is clicked', async () => {
    const wrapper = await mountSuspended(ConfirmModal, {
      ...defaultMocks,
      props: {
        open: true,
        title: 'Test',
        confirmLabel: 'Confirm'
      }
    })

    const buttons = wrapper.findAllComponents(UButtonStub)
    const confirmButton = buttons.find(b => b.text() === 'Confirm')

    expect(confirmButton?.exists()).toBe(true)
    await confirmButton?.trigger('click')

    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('sets danger color on confirm button when danger prop is true', async () => {
    const wrapper = await mountSuspended(ConfirmModal, {
      ...defaultMocks,
      props: {
        open: true,
        title: 'Test',
        confirmLabel: 'Delete',
        danger: true
      }
    })

    const buttons = wrapper.findAllComponents(UButtonStub)
    const confirmButton = buttons.find(b => b.text() === 'Delete')

    expect(confirmButton?.props('color')).toBe('error')
  })

  it('shows loader on confirm button when loading prop is true', async () => {
    const wrapper = await mountSuspended(ConfirmModal, {
      ...defaultMocks,
      props: {
        open: true,
        title: 'Test',
        confirmLabel: 'Save',
        loading: true
      }
    })

    const buttons = wrapper.findAllComponents(UButtonStub)
    const confirmButton = buttons.find(b => b.text() === 'Save')

    expect(confirmButton?.props('loading')).toBe(true)
  })
})
