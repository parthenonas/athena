import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FilesPage from '../files.vue'
import { nextTick, defineComponent } from 'vue'

const {
  fetchFilesMock,
  fetchUsageMock,
  deleteFileMock,
  downloadFileMock,
  refreshFilesMock,
  refreshUsageMock,
  formatBytesMock
} = vi.hoisted(() => ({
  fetchFilesMock: vi.fn(),
  fetchUsageMock: vi.fn(),
  deleteFileMock: vi.fn(),
  downloadFileMock: vi.fn(),
  refreshFilesMock: vi.fn(),
  refreshUsageMock: vi.fn(),
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
    fetchUsage: fetchUsageMock,
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

const UInputStub = defineComponent({
  name: 'UInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
})

const UTableStub = defineComponent({
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
})

const CommonFileUploaderModalStub = defineComponent({
  name: 'CommonFileUploaderModal',
  template: '<div data-testid="uploader-modal" />',
  props: ['modelValue', 'allowAccessControl', 'defaultAccess'],
  emits: ['update:modelValue', 'success']
})

const ConfirmModalStub = defineComponent({
  name: 'ConfirmModal',
  template: '<div data-testid="confirm-modal" />',
  props: ['open', 'loading'],
  emits: ['update:open', 'confirm']
})

const UButtonStub = defineComponent({
  name: 'UButton',
  props: ['label', 'icon'],
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot />{{ label }}</button>'
})

const UCardStub = defineComponent({
  name: 'UCard',
  template: '<div><slot /></div>'
})

const UProgressStub = defineComponent({
  name: 'UProgress',
  props: ['value', 'modelValue', 'color'],
  template: '<div data-testid="progress" :data-value="modelValue ?? value" :data-color="color"></div>'
})

const UIconStub = defineComponent({ name: 'UIcon', template: '<i />' })
const UBadgeStub = defineComponent({ name: 'UBadge', template: '<span><slot /></span>' })
const UTooltipStub = defineComponent({ name: 'UTooltip', template: '<div><slot /></div>' })

const mockFiles = [
  {
    id: '1',
    originalName: 'homework.docx',
    mimeType: 'application/word',
    size: 1024,
    access: 'private',
    url: '/media/1/download',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    originalName: 'cat.jpg',
    mimeType: 'image/jpeg',
    size: 2048,
    access: 'public',
    url: 'http://minio/bucket/cat.jpg',
    createdAt: new Date().toISOString()
  }
]

const mockUsage = {
  usedBytes: 3072,
  limitBytes: 10240,
  percentage: 30
}

describe('Files Page', () => {
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
        UCard: UCardStub,
        UProgress: UProgressStub,
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
      refresh: refreshFilesMock
    })

    fetchUsageMock.mockResolvedValue({
      data: { value: mockUsage },
      status: { value: 'success' },
      refresh: refreshUsageMock
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render files and usage stats', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    expect(fetchFilesMock).toHaveBeenCalled()
    expect(fetchUsageMock).toHaveBeenCalled()

    expect(wrapper.text()).toContain('pages.files.title')
    expect(wrapper.text()).toContain('pages.files.storage-usage')

    expect(wrapper.text()).toContain('homework.docx')

    expect(wrapper.text()).toContain('30%')
    const progress = wrapper.find('[data-testid="progress"]')
    expect(progress.attributes('data-value')).toBe('30')
    expect(progress.attributes('data-color')).toBe('primary')
  })

  it('should change progress color to error if usage > 90%', async () => {
    fetchUsageMock.mockResolvedValue({
      data: { value: { ...mockUsage, percentage: 95 } },
      status: { value: 'success' },
      refresh: refreshUsageMock
    })

    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const progress = wrapper.find('[data-testid="progress"]')
    expect(progress.attributes('data-value')).toBe('95')
    expect(progress.attributes('data-color')).toBe('error')
  })

  it('should open Upload Modal when clicking upload button', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const uploadBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.files.upload')

    await uploadBtn?.trigger('click')

    const modal = wrapper.findComponent(CommonFileUploaderModalStub)
    expect(modal.props('modelValue')).toBe(true)
    expect(modal.props('defaultAccess')).toBe('public')
  })

  it('should refresh FILES and USAGE on upload success', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const modal = wrapper.findComponent(CommonFileUploaderModalStub)
    modal.vm.$emit('success')

    expect(refreshFilesMock).toHaveBeenCalled()
    expect(refreshUsageMock).toHaveBeenCalled()
  })

  it('should open delete confirmation modal', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const deleteBtns = wrapper.findAllComponents(UButtonStub)
      .filter(b => b.props('icon') === 'i-lucide-trash')

    await deleteBtns[0]!.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.props('open')).toBe(true)
  })

  it('should delete file and refresh ALL data on confirm', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)

    const deleteBtns = wrapper.findAllComponents(UButtonStub)
      .filter(b => b.props('icon') === 'i-lucide-trash')
    await deleteBtns[0]!.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    modal.vm.$emit('confirm')

    await nextTick()
    await vi.advanceTimersByTimeAsync(1)

    expect(deleteFileMock).toHaveBeenCalledWith('1')
    expect(refreshFilesMock).toHaveBeenCalled()
    expect(refreshUsageMock).toHaveBeenCalled()

    expect(modal.props('open')).toBe(false)
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

    expect(writeTextMock).toHaveBeenCalledWith('http://minio/bucket/cat.jpg')
  })

  it('should update filters with debounce when searching', async () => {
    const wrapper = await mountSuspended(FilesPage, defaultMocks)
    const input = wrapper.findComponent(UInputStub)

    await input.find('input').setValue('homework')

    expect((wrapper.vm as any).search).toBe('homework')
    expect((wrapper.vm as any).filters.search).toBe('')

    vi.advanceTimersByTime(500)

    expect((wrapper.vm as any).filters.search).toBe('homework')
  })
})
