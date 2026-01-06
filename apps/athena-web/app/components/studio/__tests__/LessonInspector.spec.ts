import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StudioLessonInspector from '../LessonInspector.vue'
import type { LessonResponse } from '@athena/types'

const UInputStub = {
  name: 'UInput',
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue']
}

const UTextareaStub = {
  name: 'UTextarea',
  template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue']
}

const USwitchStub = {
  name: 'USwitch',
  template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  props: ['modelValue']
}

const UButtonStub = {
  name: 'UButton',
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
  props: ['label', 'icon', 'color']
}

const tMock = (key: string) => key
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: tMock })
}))

const globalMountOptions = {
  mocks: { $t: tMock },
  stubs: {
    UInput: UInputStub,
    UTextarea: UTextareaStub,
    USwitch: USwitchStub,
    UButton: UButtonStub,
    UFormField: { template: '<div><slot /></div>' },
    UIcon: true,
    USeparator: true
  }
}

describe('StudioLessonInspector.vue', () => {
  const mockLesson: LessonResponse = {
    id: 'lesson-123',
    courseId: 'course-1',
    title: 'Intro to Algorithms',
    goals: 'Learn Bubble Sort',
    isDraft: true,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('should render lesson details correctly', () => {
    const wrapper = mount(StudioLessonInspector, {
      props: { lesson: mockLesson },
      global: globalMountOptions
    })

    const titleInput = wrapper.findComponent(UInputStub)
    expect(titleInput.props('modelValue')).toBe(mockLesson.title)

    const goalsInput = wrapper.findComponent(UTextareaStub)
    expect(goalsInput.props('modelValue')).toBe(mockLesson.goals)

    const draftSwitch = wrapper.findComponent(USwitchStub)
    expect(draftSwitch.props('modelValue')).toBe(true)
  })

  it('should emit update when Title changes', async () => {
    const wrapper = mount(StudioLessonInspector, {
      props: { lesson: mockLesson },
      global: globalMountOptions
    })

    const titleInput = wrapper.findComponent(UInputStub)
    await titleInput.vm.$emit('update:modelValue', 'New Title')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0]).toEqual([
      mockLesson.id,
      { title: 'New Title' }
    ])
  })

  it('should emit update when Goals change', async () => {
    const wrapper = mount(StudioLessonInspector, {
      props: { lesson: mockLesson },
      global: globalMountOptions
    })

    const goalsInput = wrapper.findComponent(UTextareaStub)
    await goalsInput.vm.$emit('update:modelValue', 'New Goals')

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0]).toEqual([
      mockLesson.id,
      { goals: 'New Goals' }
    ])
  })

  it('should emit update when Draft status changes', async () => {
    const wrapper = mount(StudioLessonInspector, {
      props: { lesson: mockLesson },
      global: globalMountOptions
    })

    const draftSwitch = wrapper.findComponent(USwitchStub)
    await draftSwitch.vm.$emit('update:modelValue', false)

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')![0]).toEqual([
      mockLesson.id,
      { isDraft: false }
    ])
  })

  it('should emit delete event when clicking trash button', async () => {
    const wrapper = mount(StudioLessonInspector, {
      props: { lesson: mockLesson },
      global: globalMountOptions
    })

    const deleteBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash-2')

    expect(deleteBtn).toBeDefined()
    await deleteBtn?.trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([mockLesson])
  })
})
