import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StudioStructureSidebar from '../StructureSidebar.vue'
import type { LessonResponse } from '@athena/types'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '~/stores/auth.store'

const UButtonStub = {
  name: 'UButton',
  template: '<button class="u-button-stub" @click="$emit(\'click\')"><slot /></button>',
  props: ['icon', 'label', 'variant', 'color']
}

const VueDraggableStub = {
  template: '<div><slot /></div>',
  props: ['modelValue', 'animation', 'handle'],
  methods: {
    simulateEnd(evt: unknown) {
      (this as any).$emit('end', evt)
    }
  }
}

const backMock = vi.fn()
const globalRouterMock = {
  back: backMock
}

const tMock = (key: string) => key
const setLocaleMock = vi.fn()
const localeRef = ref('ru')

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: tMock,
    locale: localeRef,
    setLocale: setLocaleMock
  })
}))

const UDashboardNavbarStub = { template: '<div><slot name="leading" /><slot name="title" /></div>' }
const UDashboardPanelStub = { template: '<div><slot name="header" /><slot name="body" /><slot name="footer" /></div>' }
const UDropdownMenuStub = { template: '<div><slot /></div>', props: ['items'] }

const globalMountOptions = {
  mocks: {
    $t: tMock,
    $router: globalRouterMock
  },
  stubs: {
    VueDraggable: VueDraggableStub,
    UDashboardPanel: UDashboardPanelStub,
    UDashboardNavbar: UDashboardNavbarStub,
    UDropdownMenu: UDropdownMenuStub,
    UButton: UButtonStub,
    UIcon: true,
    UBadge: true,
    UColorModeButton: true
  },
  plugins: [
    createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        auth: {
          user: { login: 'test_user', id: 'u1' }
        }
      }
    })
  ]
}

describe('StudioStructureSidebar.vue', () => {
  const lessonsMock: LessonResponse[] = [
    { id: 'l1', title: 'Lesson 1', isDraft: false, order: 0, goals: '...', courseId: 'c1', createdAt: new Date(), updatedAt: new Date() },
    { id: 'l2', title: 'Lesson 2', isDraft: true, order: 1, goals: '...', courseId: 'c1', createdAt: new Date(), updatedAt: new Date() }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localeRef.value = 'ru'
  })

  it('should render lesson list correctly', () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: {
        lessons: lessonsMock,
        activeLessonId: 'l1'
      },
      global: globalMountOptions
    })

    const lessonItems = wrapper.findAll('.group')
    expect(lessonItems).toHaveLength(2)

    expect(lessonItems[0]!.text()).toContain('1. Lesson 1')
    expect(lessonItems[1]!.text()).toContain('2. Lesson 2')
  })

  it('should highlight active lesson', () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: {
        lessons: lessonsMock,
        activeLessonId: 'l1'
      },
      global: globalMountOptions
    })

    const lessonItems = wrapper.findAll('.group')

    const activeChevron = lessonItems[0]!.find('[name="i-lucide-chevron-right"]')
    expect(activeChevron.exists()).toBe(true)

    const inactiveChevron = lessonItems[1]!.find('[name="i-lucide-chevron-right"]')
    expect(inactiveChevron.exists()).toBe(false)
  })

  it('should emit "update:activeLessonId" when clicking a lesson', async () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: {
        lessons: lessonsMock,
        activeLessonId: 'l1'
      },
      global: globalMountOptions
    })

    const lesson2 = wrapper.findAll('.group')[1]
    await lesson2!.trigger('click')

    expect(wrapper.emitted('update:activeLessonId')).toBeTruthy()
    expect(wrapper.emitted('update:activeLessonId')![0]).toEqual(['l2'])
  })

  it('should emit "add" when clicking Add button', async () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: { lessons: [], activeLessonId: null },
      global: globalMountOptions
    })

    const addBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.studio.builder.add-lesson')

    expect(addBtn).toBeDefined()
    await addBtn?.trigger('click')

    expect(wrapper.emitted('add')).toBeTruthy()
  })

  it('should call router.back() when clicking back button', async () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: { lessons: [], activeLessonId: null },
      global: globalMountOptions
    })

    const backBtn = wrapper.findComponent(UButtonStub)

    expect(backBtn.exists()).toBe(true)
    await backBtn.trigger('click')

    expect(backMock).toHaveBeenCalled()
  })

  it('should toggle language on click', async () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: { lessons: [], activeLessonId: null },
      global: globalMountOptions
    })

    const langBtn = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-languages')

    expect(langBtn).toBeDefined()
    await langBtn?.trigger('click')

    expect(setLocaleMock).toHaveBeenCalledWith('en')

    localeRef.value = 'en'
    await langBtn?.trigger('click')
    expect(setLocaleMock).toHaveBeenCalledWith('ru')
  })

  it('should construct user menu items correctly', () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: { lessons: [], activeLessonId: null },
      global: globalMountOptions
    })

    const dropdown = wrapper.findComponent(UDropdownMenuStub)
    const items = dropdown.props('items') as any[][]

    expect(items).toHaveLength(3)
    expect(items[0]![0].label).toBe('test_user')
    expect(items[2]![0].label).toBe('pages.dashboard.menu.logout')
  })

  it('should call logout when selecting logout menu item', async () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: { lessons: [], activeLessonId: null },
      global: globalMountOptions
    })

    const authStore = useAuthStore()
    const dropdown = wrapper.findComponent(UDropdownMenuStub)
    const items = dropdown.props('items') as any[][]

    const logoutItem = items[2]![0]
    logoutItem.onSelect()

    expect(authStore.logout).toHaveBeenCalled()
  })

  it('should emit "reorder" when drag ends', async () => {
    const wrapper = mount(StudioStructureSidebar, {
      props: { lessons: lessonsMock, activeLessonId: null },
      global: globalMountOptions
    })

    const draggable = wrapper.findComponent(VueDraggableStub)

    const mockEvent = { newIndex: 1, oldIndex: 0 }
    draggable.vm.simulateEnd(mockEvent)

    expect(wrapper.emitted('reorder')).toBeTruthy()
    expect(wrapper.emitted('reorder')![0]).toEqual([mockEvent])
  })
})
