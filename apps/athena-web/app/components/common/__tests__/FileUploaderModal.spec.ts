import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import FileUploaderModal from '../FileUploaderModal.vue'
import { FileAccess } from '@athena/types'
import { defineComponent } from 'vue'

vi.mock('@athena/types', () => ({
  FileAccess: {
    Public: 'public',
    Private: 'private'
  }
}))

const uploadFileSpy = vi.fn()

mockNuxtImport('useMedia', () => {
  return () => ({
    uploadFile: uploadFileSpy
  })
})

mockNuxtImport('useI18n', () => {
  return () => ({
    t: (key: string) => key
  })
})

const UModalStub = defineComponent({
  name: 'UModal',
  props: ['open'],
  template: `
    <div v-if="open" data-testid="modal">
      <slot name="body" />
      <slot name="footer" />
    </div>
  `
})

const UFileUploadStub = defineComponent({
  name: 'UFileUpload',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const triggerUpload = () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      emit('update:modelValue', file)
    }
    return { triggerUpload }
  },
  template: `
    <div 
      data-testid="file-upload" 
      @click="triggerUpload"
    >
      {{ modelValue ? modelValue.name : 'No file' }}
    </div>
  `
})

const USwitchStub = defineComponent({
  name: 'USwitch',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <button data-testid="switch" @click="$emit('update:modelValue', !modelValue)">
      {{ modelValue ? 'On' : 'Off' }}
    </button>
  `
})

const UButtonStub = defineComponent({
  name: 'UButton',
  props: ['disabled', 'loading', 'label'],
  emits: ['click'],
  template: `
    <button 
      data-testid="u-button" 
      :data-label="label"
      :disabled="disabled" 
      class="u-button"
      @click="$emit('click', $event)"
    >
      {{ label }}
    </button>
  `
})

const UFormFieldStub = defineComponent({
  name: 'UFormField',
  template: '<div><slot /></div>'
})

describe('FileUploaderModal', () => {
  const globalStubs = {
    UModal: UModalStub,
    UFileUpload: UFileUploadStub,
    USwitch: USwitchStub,
    UButton: UButtonStub,
    UFormField: UFormFieldStub
  }

  const globalMocks = {
    $t: (msg: string) => msg
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should renders correctly when open', async () => {
    const wrapper = await mountSuspended(FileUploaderModal, {
      global: { stubs: globalStubs, mocks: globalMocks },
      props: { modelValue: true }
    })

    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="file-upload"]').exists()).toBe(true)
  })

  it('should hide switch if allowAccessControl is false', async () => {
    const wrapper = await mountSuspended(FileUploaderModal, {
      global: { stubs: globalStubs, mocks: globalMocks },
      props: {
        modelValue: true,
        allowAccessControl: false
      }
    })

    expect(wrapper.find('[data-testid="switch"]').exists()).toBe(false)
  })

  it('should show switch if allowAccessControl is true', async () => {
    const wrapper = await mountSuspended(FileUploaderModal, {
      global: { stubs: globalStubs, mocks: globalMocks },
      props: {
        modelValue: true,
        allowAccessControl: true,
        defaultAccess: FileAccess.Private
      }
    })

    expect(wrapper.find('[data-testid="switch"]').exists()).toBe(true)
  })

  it('should enable submit button when file is selected', async () => {
    const wrapper = await mountSuspended(FileUploaderModal, {
      global: { stubs: globalStubs, mocks: globalMocks },
      props: { modelValue: true }
    })

    await wrapper.find('[data-testid="file-upload"]').trigger('click')

    const btn = wrapper.find('[data-label="common.upload"]')
    expect((btn.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('should call uploadFile with correct params (Private default)', async () => {
    const wrapper = await mountSuspended(FileUploaderModal, {
      global: { stubs: globalStubs, mocks: globalMocks },
      props: {
        modelValue: true,
        allowAccessControl: true,
        defaultAccess: FileAccess.Private
      }
    })

    await wrapper.find('[data-testid="file-upload"]').trigger('click')
    await wrapper.find('[data-label="common.upload"]').trigger('click')

    expect(uploadFileSpy).toHaveBeenCalledTimes(1)
    expect(uploadFileSpy).toHaveBeenCalledWith(expect.any(File), FileAccess.Private)

    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('should call uploadFile with Public access when switch is toggled', async () => {
    const wrapper = await mountSuspended(FileUploaderModal, {
      global: { stubs: globalStubs, mocks: globalMocks },
      props: {
        modelValue: true,
        allowAccessControl: true,
        defaultAccess: FileAccess.Private
      }
    })

    await wrapper.find('[data-testid="file-upload"]').trigger('click')
    await wrapper.find('[data-testid="switch"]').trigger('click')
    await wrapper.find('[data-label="common.upload"]').trigger('click')
    expect(uploadFileSpy).toHaveBeenCalledWith(expect.any(File), FileAccess.Public)
  })

  it('should reset state when modal opens', async () => {
    const wrapper = await mountSuspended(FileUploaderModal, {
      global: { stubs: globalStubs, mocks: globalMocks },
      props: {
        modelValue: true
      }
    })

    await wrapper.find('[data-testid="file-upload"]').trigger('click')
    expect((wrapper.find('[data-label="common.upload"]').element as HTMLButtonElement).disabled).toBe(false)
    await wrapper.setProps({ modelValue: false })

    await wrapper.setProps({ modelValue: true })

    expect((wrapper.find('[data-label="common.upload"]').element as HTMLButtonElement).disabled).toBe(true)
  })
})
