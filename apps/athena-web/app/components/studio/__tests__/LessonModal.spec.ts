import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StudioLessonModal from '../LessonModal.vue'
import type { LessonResponse } from '@athena/types'

import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const createLessonMock = vi.fn()
const updateLessonMock = vi.fn()
mockNuxtImport('useStudio', () => {
  return () => ({
    createLesson: createLessonMock,
    updateLesson: updateLessonMock
  })
})

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const UModalStub = {
  template: '<div><slot name="content" /></div>',
  props: ['open']
}

const UFormStub = {
  template: '<form @submit.prevent="$emit(\'submit\', { data: state })"><slot /></form>',
  props: ['schema', 'state']
}

const UInputStub = {
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue']
}

const UTextareaStub = {
  template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue']
}

const UCheckboxStub = {
  template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  props: ['modelValue']
}

const globalMountOptions = {
  mocks: {
    $t: tMock
  },
  stubs: {
    UModal: UModalStub,
    UForm: UFormStub,
    UFormField: { template: '<div><slot /></div>' },
    UInput: UInputStub,
    UTextarea: UTextareaStub,
    UCheckbox: UCheckboxStub,
    UButton: true,
    UIcon: true
  }
}

describe('StudioLessonModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const courseId = 'course-123'
  const mockLesson: LessonResponse = {
    id: 'lesson-abc',
    courseId: courseId,
    title: 'Existing Lesson',
    goals: 'Learn stuff',
    isDraft: false,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('Create Mode: should render empty form', () => {
    const wrapper = mount(StudioLessonModal, {
      props: {
        modelValue: true,
        courseId,
        lesson: null
      },
      global: globalMountOptions
    })

    expect(wrapper.text()).toContain('components.studio.lesson-modal.create-title')
    const titleInput = wrapper.findComponent(UInputStub)
    expect(titleInput.props('modelValue')).toBe('')

    const goalsInput = wrapper.findComponent(UTextareaStub)
    expect(goalsInput.props('modelValue')).toBe('')

    const draftCheckbox = wrapper.findComponent(UCheckboxStub)
    expect(draftCheckbox.props('modelValue')).toBe(true)
  })

  it('Edit Mode: should pre-fill form with lesson data', () => {
    const wrapper = mount(StudioLessonModal, {
      props: {
        modelValue: true,
        courseId,
        lesson: mockLesson
      },
      global: globalMountOptions
    })

    expect(wrapper.text()).toContain('components.studio.lesson-modal.edit-title')

    const titleInput = wrapper.findComponent(UInputStub)
    expect(titleInput.props('modelValue')).toBe(mockLesson.title)

    const goalsInput = wrapper.findComponent(UTextareaStub)
    expect(goalsInput.props('modelValue')).toBe(mockLesson.goals)

    const draftCheckbox = wrapper.findComponent(UCheckboxStub)
    expect(draftCheckbox.props('modelValue')).toBe(mockLesson.isDraft)
  })

  it('should call createLesson API on submit in Create Mode', async () => {
    const wrapper = mount(StudioLessonModal, {
      props: { modelValue: true, courseId, lesson: null },
      global: globalMountOptions
    })

    const titleInput = wrapper.findComponent(UInputStub)
    await titleInput.vm.$emit('update:modelValue', 'New Lesson Title')

    const goalsInput = wrapper.findComponent(UTextareaStub)
    await goalsInput.vm.$emit('update:modelValue', 'Some goals')

    const form = wrapper.findComponent(UFormStub)
    await form.vm.$emit('submit', {
      data: {
        title: 'New Lesson Title',
        goals: 'Some goals',
        isDraft: true
      }
    })

    expect(createLessonMock).toHaveBeenCalledTimes(1)
    expect(createLessonMock).toHaveBeenCalledWith({
      courseId,
      title: 'New Lesson Title',
      goals: 'Some goals',
      isDraft: true
    })

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    expect(wrapper.emitted('success')).toBeTruthy()
  })

  it('should call updateLesson API on submit in Edit Mode', async () => {
    const wrapper = mount(StudioLessonModal, {
      props: { modelValue: true, courseId, lesson: mockLesson },
      global: globalMountOptions
    })

    const titleInput = wrapper.findComponent(UInputStub)
    await titleInput.vm.$emit('update:modelValue', 'Updated Title')

    const form = wrapper.findComponent(UFormStub)
    await form.vm.$emit('submit', {
      data: {
        title: 'Updated Title',
        goals: mockLesson.goals,
        isDraft: mockLesson.isDraft
      }
    })

    expect(updateLessonMock).toHaveBeenCalledTimes(1)
    expect(updateLessonMock).toHaveBeenCalledWith(mockLesson.id, {
      title: 'Updated Title',
      goals: mockLesson.goals,
      isDraft: mockLesson.isDraft
    })

    expect(createLessonMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('success')).toBeTruthy()
  })

  it('should reset form when switching from Edit to Create mode via props', async () => {
    const wrapper = mount(StudioLessonModal, {
      props: { modelValue: true, courseId, lesson: mockLesson },
      global: globalMountOptions
    })

    const titleInput = wrapper.findComponent(UInputStub)
    expect(titleInput.props('modelValue')).toBe(mockLesson.title)

    await wrapper.setProps({ lesson: null })

    expect(titleInput.props('modelValue')).toBe('')

    const draftCheckbox = wrapper.findComponent(UCheckboxStub)
    expect(draftCheckbox.props('modelValue')).toBe(true)
  })
})
