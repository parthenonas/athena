import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import LibraryInsertSlideover from '../LibraryInsertSlideover.vue'
import { BlockType } from '@athena/types'

const { fetchLibraryBlocksMock } = vi.hoisted(() => ({
  fetchLibraryBlocksMock: vi.fn()
}))

mockNuxtImport('useStudio', () => {
  return () => ({
    fetchLibraryBlocks: fetchLibraryBlocksMock
  })
})

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const UInputStub = {
  template: '<input class="u-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue']
}
const UInputTagsStub = {
  template: '<div class="u-input-tags-stub"></div>',
  props: ['modelValue']
}
const UButtonStub = {
  template: '<button class="u-button-stub" @click="$emit(\'click\')">{{ label }}</button>',
  props: ['label']
}

const globalMountOptions = {
  mocks: { $t: tMock },
  stubs: {
    USlideover: {
      template: '<div v-if="open"><slot name="body" /></div>',
      props: ['open'],
      emits: ['update:open']
    },
    UInput: UInputStub,
    UInputTags: UInputTagsStub,
    UButton: UButtonStub,
    UIcon: true,
    UBadge: { template: '<span><slot/></span>' },
    USeparator: true
  }
}

describe('LibraryInsertSlideover.vue', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      type: BlockType.Text,
      content: { json: { text: 'Some text template' } },
      tags: ['sql'],
      updatedAt: new Date()
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    fetchLibraryBlocksMock.mockResolvedValue({
      data: { value: { data: mockTemplates, meta: { total: 1 } } },
      status: { value: 'success' }
    })
  })

  it('should render list of templates when loaded', async () => {
    const wrapper = await mountSuspended(LibraryInsertSlideover, {
      props: { modelValue: true },
      global: globalMountOptions
    })

    expect(fetchLibraryBlocksMock).toHaveBeenCalled()

    expect(wrapper.text()).toContain('Some text template')
    expect(wrapper.text()).toContain('sql')
  })

  it('should show empty state if no templates found', async () => {
    fetchLibraryBlocksMock.mockResolvedValue({
      data: { value: { data: [], meta: { total: 0 } } },
      status: { value: 'success' }
    })

    const wrapper = await mountSuspended(LibraryInsertSlideover, {
      props: { modelValue: true },
      global: globalMountOptions
    })

    expect(wrapper.text()).toContain('components.studio.library-insert.empty')
  })

  it('should emit "insert" and close slideover when clicking insert button', async () => {
    const wrapper = await mountSuspended(LibraryInsertSlideover, {
      props: { modelValue: true },
      global: globalMountOptions
    })

    const insertBtn = wrapper.findComponent(UButtonStub)
    await insertBtn.trigger('click')

    expect(wrapper.emitted('insert')).toBeTruthy()
    expect(wrapper.emitted('insert')![0]).toEqual([
      BlockType.Text,
      { json: { text: 'Some text template' } }
    ])

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })
})
