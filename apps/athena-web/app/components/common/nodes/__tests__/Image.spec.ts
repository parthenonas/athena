import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ImageNode from '../Image.vue'

const uploadFileMock = vi.fn()
const deleteFileMock = vi.fn()

vi.mock('~/composables/useMedia', () => ({
  useMedia: () => ({
    uploadFile: uploadFileMock,
    deleteFile: deleteFileMock
  }),
  useImagePreview: () => ({
    openPreview: vi.fn()
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const NodeViewWrapperStub = {
  template: '<div class="node-view-wrapper"><slot /></div>'
}

const UFileUploadStub = {
  name: 'UFileUpload',
  template: '<div class="file-upload-stub"></div>',
  props: ['loading']
}

const UButtonStub = {
  name: 'UButton',
  template: '<button class="delete-btn"></button>'
}

const NuxtImgStub = {
  name: 'NuxtImg',
  template: '<img :src="src" class="nuxt-img-stub" />',
  props: ['src', 'alt']
}

const globalMountOptions = {
  stubs: {
    NodeViewWrapper: NodeViewWrapperStub,
    UFileUpload: UFileUploadStub,
    UButton: UButtonStub,
    NuxtImg: NuxtImgStub,
    UModal: true
  },
  mocks: {
    $t: (msg: string) => msg
  }
}

describe('ImageNode.vue', () => {
  const defaultProps = {
    editor: {} as any,
    node: {
      attrs: { src: null, alt: null, id: null }
    } as any,
    decorations: [],
    selected: false,
    extension: {} as any,
    getPos: () => 0,
    updateAttributes: vi.fn(),
    deleteNode: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render Uploader when no src is present', () => {
    const wrapper = mount(ImageNode, {
      props: defaultProps as any,
      global: globalMountOptions
    })
    expect(wrapper.findComponent(UFileUploadStub).exists()).toBe(true)
  })

  it('should render Image and Delete button when src is present', () => {
    const propsWithImage = {
      ...defaultProps,
      node: {
        attrs: { src: 'https://example.com/img.png', alt: 'Test', id: 'file-123' }
      } as any
    }
    const wrapper = mount(ImageNode, {
      props: propsWithImage as any,
      global: globalMountOptions
    })

    expect(wrapper.findComponent(NuxtImgStub).exists()).toBe(true)
    expect(wrapper.findComponent(UButtonStub).exists()).toBe(true)
  })

  it('should upload file and update attributes', async () => {
    const wrapper = mount(ImageNode, {
      props: defaultProps as any,
      global: globalMountOptions
    })

    const mockResponse = { url: 'img.png', originalName: 'test.png', id: '123' }
    uploadFileMock.mockResolvedValue(mockResponse)

    const uploader = wrapper.findComponent(UFileUploadStub)
    const file = new File([''], 'test.png', { type: 'image/png' })
    await uploader.vm.$emit('update:modelValue', file)

    await flushPromises()

    expect(uploadFileMock).toHaveBeenCalled()
    expect(defaultProps.updateAttributes).toHaveBeenCalledWith({
      src: mockResponse.url,
      alt: mockResponse.originalName,
      id: mockResponse.id
    })
  })

  it('should call deleteFile API if node has ID, then delete node', async () => {
    const propsWithId = {
      ...defaultProps,
      node: { attrs: { src: 'img.png', id: 'file-123' } } as any,
      deleteNode: vi.fn()
    }

    const wrapper = mount(ImageNode, {
      props: propsWithId as any,
      global: globalMountOptions
    })
    const deleteBtn = wrapper.findComponent(UButtonStub)
    await deleteBtn.vm.$emit('click', { stopPropagation: () => {} })

    await flushPromises()

    expect(deleteFileMock).toHaveBeenCalledWith('file-123')
    expect(propsWithId.deleteNode).toHaveBeenCalled()
  })

  it('should ONLY delete node if no ID is present', async () => {
    const propsNoId = {
      ...defaultProps,
      node: { attrs: { src: 'img.png', id: null } } as any,
      deleteNode: vi.fn()
    }

    const wrapper = mount(ImageNode, {
      props: propsNoId as any,
      global: globalMountOptions
    })

    const deleteBtn = wrapper.findComponent(UButtonStub)
    await deleteBtn.vm.$emit('click', { stopPropagation: () => {} })

    await flushPromises()

    expect(deleteFileMock).not.toHaveBeenCalled()
    expect(propsNoId.deleteNode).toHaveBeenCalled()
  })
})
