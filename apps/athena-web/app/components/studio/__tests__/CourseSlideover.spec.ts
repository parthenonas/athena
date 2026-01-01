import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CourseSlideover from '../CourseSlideover.vue'
import { nextTick, defineComponent } from 'vue'

const { createCourseMock, updateCourseMock } = vi.hoisted(() => ({
  createCourseMock: vi.fn(),
  updateCourseMock: vi.fn()
}))

vi.mock('~/composables/useStudio', () => ({
  useStudio: () => ({
    createCourse: createCourseMock,
    updateCourse: updateCourseMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

const USlideoverStub = defineComponent({
  name: 'USlideover',
  template: `
    <div v-if="open" data-testid="slideover">
      <div data-testid="title">{{ title }}</div>
      <slot name="body" />
    </div>
  `,
  props: ['open', 'title'],
  emits: ['update:open']
})

const UFormStub = defineComponent({
  name: 'UForm',
  template: `<form @submit.prevent="submit"><slot /></form>`,
  props: ['state', 'schema'],
  emits: ['submit'],
  setup(props: any, { emit }: any) {
    return {
      submit: () => emit('submit', { data: props.state })
    }
  }
})

const UInputStub = defineComponent({
  name: 'UInput',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<input data-testid="title-input" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
})

const UTextareaStub = defineComponent({
  name: 'UTextarea',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `<textarea data-testid="desc-input" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`
})

const UInputTagsStub = defineComponent({
  name: 'UInputTags',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: `
    <div data-testid="tags-input">
      <span v-for="tag in modelValue" :key="tag" class="tag">{{ tag }}</span>
      <button type="button" @click="addTag('test-tag')">Add Tag</button>
    </div>
  `,
  setup(props: any, { emit }: any) {
    const addTag = (tag: string) => {
      const newTags = [...(props.modelValue || []), tag]
      emit('update:modelValue', newTags)
    }
    return { addTag }
  }
})

const UButtonStub = defineComponent({ name: 'UButton', template: '<button />' })

describe('CourseSlideover', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (k: string) => k },
      stubs: {
        USlideover: USlideoverStub,
        UForm: UFormStub,
        UInput: UInputStub,
        UTextarea: UTextareaStub,
        UInputTags: UInputTagsStub,
        UButton: UButtonStub,
        UFormField: { template: '<div><slot /></div>' }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should open empty in Create mode', async () => {
    const wrapper = await mountSuspended(CourseSlideover, {
      ...defaultMocks,
      props: { modelValue: true, course: null }
    })

    expect(wrapper.find('[data-testid="title"]').text()).toContain('create-title')

    const titleInput = wrapper.findComponent(UInputStub)
    expect(titleInput.props('modelValue')).toBe('')
  })

  it('should fill form in Edit mode', async () => {
    const mockCourse = {
      id: '123',
      title: 'Vue Mastery',
      description: 'Best course',
      tags: ['vue', 'js'],
      isPublished: true,
      ownerId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const wrapper = await mountSuspended(CourseSlideover, {
      ...defaultMocks,
      props: { modelValue: true, course: mockCourse }
    })

    await nextTick()

    expect(wrapper.find('[data-testid="title"]').text()).toContain('edit-title')

    const titleInput = wrapper.findComponent(UInputStub)
    expect(titleInput.props('modelValue')).toBe('Vue Mastery')

    const descInput = wrapper.findComponent(UTextareaStub)
    expect(descInput.props('modelValue')).toBe('Best course')

    const tagsInput = wrapper.findComponent(UInputTagsStub)
    expect(tagsInput.props('modelValue')).toEqual(['vue', 'js'])
  })

  it('should call createCourse on submit', async () => {
    const wrapper = await mountSuspended(CourseSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })

    const titleInput = wrapper.findComponent(UInputStub)
    titleInput.vm.$emit('update:modelValue', 'New Course')

    const tagsInput = wrapper.findComponent(UInputTagsStub)

    tagsInput.vm.addTag('coding')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(createCourseMock).toHaveBeenCalledWith({
      title: 'New Course',
      description: '',
      tags: ['coding'],
      isPublished: false
    })

    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('should call updateCourse on submit', async () => {
    const mockCourse = {
      id: 'course-1',
      title: 'Old Title',
      description: '',
      tags: [],
      isPublished: false,
      ownerId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const wrapper = await mountSuspended(CourseSlideover, {
      ...defaultMocks,
      props: { modelValue: true, course: mockCourse }
    })

    const titleInput = wrapper.findComponent(UInputStub)
    titleInput.vm.$emit('update:modelValue', 'Updated Title')

    const form = wrapper.findComponent(UFormStub)
    await form.trigger('submit')

    expect(updateCourseMock).toHaveBeenCalledWith('course-1', {
      title: 'Updated Title',
      description: '',
      tags: []
    })

    expect(wrapper.emitted('success')).toBeTruthy()
  })
})
