import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import VideoNode from '../Video.vue'
import { FileAccess } from '@athena/types'

const uploadFileMock = vi.fn()
const deleteFileMock = vi.fn()

vi.mock('~/composables/useMedia', () => ({
  useMedia: () => ({
    uploadFile: uploadFileMock,
    deleteFile: deleteFileMock
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

const globalMountOptions = {
  stubs: {
    NodeViewWrapper: NodeViewWrapperStub,
    UFileUpload: UFileUploadStub,
    UButton: UButtonStub
  },
  mocks: {
    $t: (msg: string) => msg
  }
}

describe('VideoNode.vue', () => {
  const defaultProps = {
    editor: {} as any,
    node: {
      attrs: { src: null, type: 'video/mp4', id: null }
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
    const wrapper = mount(VideoNode, {
      props: defaultProps as any,
      global: globalMountOptions
    })
    expect(wrapper.findComponent(UFileUploadStub).exists()).toBe(true)
    expect(wrapper.find('video').exists()).toBe(false)
  })

  it('should render Video player and Delete button when src is present', () => {
    const propsWithVideo = {
      ...defaultProps,
      node: {
        attrs: {
          src: 'https://example.com/video.mp4',
          type: 'video/mp4',
          id: 'vid-123'
        }
      } as any
    }
    const wrapper = mount(VideoNode, {
      props: propsWithVideo as any,
      global: globalMountOptions
    })

    expect(wrapper.findComponent(UFileUploadStub).exists()).toBe(false)

    const videoTag = wrapper.find('video')
    expect(videoTag.exists()).toBe(true)

    expect(wrapper.findComponent(UButtonStub).exists()).toBe(true)
  })

  it('should upload file and update attributes (src, type, id)', async () => {
    const wrapper = mount(VideoNode, {
      props: defaultProps as any,
      global: globalMountOptions
    })

    const mockResponse = { url: 'video.mp4', originalName: 'test.mp4', id: 'new-vid-id' }
    uploadFileMock.mockResolvedValue(mockResponse)

    const uploader = wrapper.findComponent(UFileUploadStub)

    const file = new File([''], 'test.mp4', { type: 'video/mp4' })
    await uploader.vm.$emit('update:modelValue', file)

    await flushPromises()

    expect(uploadFileMock).toHaveBeenCalledWith(file, FileAccess.Public)

    expect(defaultProps.updateAttributes).toHaveBeenCalledWith({
      src: mockResponse.url,
      type: 'video/mp4',
      id: mockResponse.id
    })
  })

  it('should call deleteFile API if node has ID, then delete node', async () => {
    const propsWithId = {
      ...defaultProps,
      node: { attrs: { src: 'video.mp4', id: 'vid-123' } } as any,
      deleteNode: vi.fn()
    }

    const wrapper = mount(VideoNode, {
      props: propsWithId as any,
      global: globalMountOptions
    })

    const deleteBtn = wrapper.findComponent(UButtonStub)
    await deleteBtn.vm.$emit('click', { stopPropagation: () => {} })

    await flushPromises()

    expect(deleteFileMock).toHaveBeenCalledWith('vid-123')
    expect(propsWithId.deleteNode).toHaveBeenCalled()
  })

  it('should ONLY delete node if no ID is present', async () => {
    const propsNoId = {
      ...defaultProps,
      node: { attrs: { src: 'video.mp4', id: null } } as any,
      deleteNode: vi.fn()
    }

    const wrapper = mount(VideoNode, {
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
