import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FilesPage from '../files.vue'
import { nextTick } from 'vue'

const { fetchFilesMock, deleteFileMock, downloadFileMock, refreshMock, formatBytesMock } = vi.hoisted(() => ({
  fetchFilesMock: vi.fn(),
  deleteFileMock: vi.fn(),
  downloadFileMock: vi.fn(),
  refreshMock: vi.fn(),
  formatBytesMock: vi.fn(bytes => `${bytes} B`)
}))

const writeTextMock = vi.fn()

vi.mock('@athena/types', () => ({
  FileAccess: {
    Public: 'public',
    Private: 'private'
  }
}))

vi.mock('~/composables/useMedia', () => ({
  useMedia: () => ({
    fetchFiles: fetchFilesMock,
    deleteFile: deleteFileMock,
    downloadFile: downloadFileMock,
    formatBytes: formatBytesMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    useRuntimeConfig: () => ({
      public: {
        apiUrl: 'http://localhost:3000/api'
      }
    })
  }
})

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: writeTextMock
  },
  writable: true,
  configurable: true
})

const UInputStub = {
  name: 'UInput',
  props: ['modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
}

const UTableStub = {
  name: 'UTable',
  props: ['data', 'columns'],
  template: `
    <table>
      <tbody>
        <tr v-for="(row, index) in data" :key="row.id">
          <td><slot name="originalName-cell" :row="{ original: row }" /></td>
          <td><slot name="access-cell" :row="{ original: row }" /></td>
          <td><slot name="size-cell" :row="{ original: row }" /></td>
          <td><slot name="actions-cell" :row="{ original: row }" /></td>
        </tr>
      </tbody>
    </table>
  `
}

const CommonFileUploaderModalStub = {
  name: 'CommonFileUploaderModal',
  template: '<div data-testid="uploader-modal" />',
  props: ['modelValue', 'allowAccessControl', 'defaultAccess'],
  emits: ['update:modelValue', 'success']
}

const ConfirmModalStub = {
  name: 'ConfirmModal',
  template: '<div data-testid="confirm-modal" />',
  props: ['open', 'loading'],
  emits: ['update:open', 'confirm']
}

const UButtonStub = {
  name: 'UButton',
  template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>',
  props: ['label', 'icon']
}

const UIconStub = { name: 'UIcon', template: '<i />' }
const UBadgeStub = { name: 'UBadge', template: '<span><slot /></span>' }
const UTooltipStub = { name: 'UTooltip', template: '<div><slot /></div>' }

const mockFiles = [
  {
    id: '1',
    originalName: 'avatar.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    access: 'public',
    url: 'http://minio/bucket/avatar.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    originalName: 'secret.pdf',
    mimeType: 'application/pdf',
    size: 2048,
    access: 'private',
    url: '/media/2/download',
    createdAt: new Date().toISOString()
  }
]

describe('Admin Files Page', () => {
  const defaultMocks = {
    global: {
      mocks: {
        $t: (key: string) => key
      },
      stubs: {
        UTable: UTableStub,
        CommonFileUploaderModal: CommonFileUploaderModalStub,
        ConfirmModal: ConfirmModalStub,
        UButton: UButtonStub,
        UInput: UInputStub,
        UIcon: UIconStub,
        UBadge: UBadgeStub,
        UTooltip: UTooltipStub,
        UPagination: true
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    fetchFilesMock.mockResolvedValue({
      data: { value: { data: mockFiles, meta: { total: 2 } } },
      status: { value: 'success' },
      refresh: refreshMock
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render and load data', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    expect(fetchFilesMock).toHaveBeenCalled()
    expect(wrapper.text()).toContain('pages.media.title')

    const table = wrapper.findComponent(UTableStub)
    expect(table.exists()).toBe(true)
    expect(table.findAll('tr').length).toBe(2)

    expect(wrapper.text()).toContain('avatar.jpg')
    expect(wrapper.text()).toContain('secret.pdf')
  })

  it('should open Upload Modal when clicking upload button', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const uploadBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.media.upload')

    await uploadBtn?.trigger('click')

    const modal = wrapper.findComponent(CommonFileUploaderModalStub)
    expect(modal.props('modelValue')).toBe(true)
    expect(modal.props('defaultAccess')).toBe('public')
  })

  it('should refresh list on upload success', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const modal = wrapper.findComponent(CommonFileUploaderModalStub)
    modal.vm.$emit('success')

    expect(refreshMock).toHaveBeenCalled()
  })

  it('should download file when clicking download button', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const downloadBtns = wrapper.findAllComponents(UButtonStub)
      .filter(b => b.props('icon') === 'i-lucide-download')

    await downloadBtns[0]!.trigger('click')

    expect(downloadFileMock).toHaveBeenCalledWith(mockFiles[0])
  })

  it('should copy correct URL for PUBLIC file', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const copyBtns = wrapper.findAllComponents(UButtonStub)
      .filter(b => b.props('icon') === 'i-lucide-link')

    expect(copyBtns.length).toBe(1)

    await copyBtns[0]!.trigger('click')

    expect(writeTextMock).toHaveBeenCalledWith('http://minio/bucket/avatar.jpg')
  })

  it('should open delete confirmation modal', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const deleteBtns = wrapper.findAllComponents(UButtonStub)
      .filter(b => b.props('icon') === 'i-lucide-trash')

    await deleteBtns[0]!.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.props('open')).toBe(true)
  })

  it('should delete file and refresh on confirm', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const deleteBtns = wrapper.findAllComponents(UButtonStub)
      .filter(b => b.props('icon') === 'i-lucide-trash')
    await deleteBtns[0]!.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    modal.vm.$emit('confirm')

    await nextTick()
    await vi.advanceTimersByTimeAsync(1)

    expect(deleteFileMock).toHaveBeenCalledWith('1')
    expect(refreshMock).toHaveBeenCalled()
    expect(modal.props('open')).toBe(false)
  })

  it('should update filters with debounce when searching', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)
    const input = wrapper.findComponent(UInputStub)

    await input.find('input').setValue('document')

    expect((wrapper.vm as any).search).toBe('document')
    expect((wrapper.vm as any).filters.search).toBe('')

    vi.advanceTimersByTime(500)

    expect((wrapper.vm as any).filters.search).toBe('document')
  })
})
