import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CohortPage from '../[id].vue'
import { ref, reactive } from 'vue'

const {
  fetchCohortMock,
  replaceMock,
  backMock,
  refreshMock
} = vi.hoisted(() => ({
  fetchCohortMock: vi.fn(),
  replaceMock: vi.fn(),
  backMock: vi.fn(),
  refreshMock: vi.fn()
}))

mockNuxtImport('useTeaching', () => {
  return () => ({
    fetchCohort: fetchCohortMock
  })
})

const routeQuery = reactive<Record<string, string>>({ tab: 'overview' })
mockNuxtImport('useRoute', () => {
  return () => ({
    params: { id: 'cohort-123' },
    query: routeQuery
  })
})

const routerMockObj = {
  replace: replaceMock,
  back: backMock,
  push: vi.fn()
}

mockNuxtImport('useRouter', () => {
  return () => routerMockObj
})

mockNuxtImport('useAsyncData', () => {
  return (key: string, handler: () => Promise<any>) => {
    const data = ref(null)
    const status = ref('pending')

    const refresh = async () => {
      refreshMock()
      status.value = 'pending'
      try {
        const result = await handler()
        data.value = result
        status.value = 'success'
      } catch {
        status.value = 'error'
      }
    }

    refresh()

    return Promise.resolve({
      data,
      status,
      refresh,
      error: ref(null)
    })
  }
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const UTabsStub = {
  name: 'UTabs',
  props: ['modelValue', 'items'],
  template: '<div class="u-tabs-stub"><slot :name="modelValue" :item="{}" /></div>',
  emits: ['update:modelValue']
}

const UButtonStub = {
  name: 'UButton',
  props: ['icon'],
  template: '<button class="stub-btn" @click="$emit(\'click\')"></button>',
  emits: ['click']
}

describe('Cohort Detail Page', () => {
  const defaultMocks = {
    global: {

      mocks: {
        $t: (key: string) => key,
        $router: routerMockObj
      },
      stubs: {
        UDashboardPage: { template: '<div><slot /></div>' },
        UDashboardNavbar: { template: '<div><slot name="leading" /><slot name="right" /></div>', props: ['title'] },
        UPageBody: { template: '<div><slot /></div>' },
        UTabs: UTabsStub,
        UButton: UButtonStub,
        USkeleton: { template: '<div class="skeleton" />' },
        TeachingCohortOverview: { template: '<div data-testid="overview" />' },
        TeachingCohortEnrollments: { template: '<div data-testid="students" />' },
        TeachingCohortSchedule: { template: '<div data-testid="schedule" />' }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    routeQuery.tab = 'overview'
  })

  it('should fetch cohort data on mount', async () => {
    fetchCohortMock.mockResolvedValue({ id: '123', name: 'Vue Course' })
    await mountSuspended(CohortPage, defaultMocks)
    expect(fetchCohortMock).toHaveBeenCalledWith('cohort-123')
  })

  it('should render 404 state if cohort is null', async () => {
    fetchCohortMock.mockResolvedValue(null)
    const wrapper = await mountSuspended(CohortPage, defaultMocks)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('pages.teaching.cohorts.not-found')
    expect(wrapper.findComponent(UTabsStub).exists()).toBe(false)
  })

  it('should sync active tab from URL query', async () => {
    fetchCohortMock.mockResolvedValue({ id: '123', name: 'Vue Course' })
    routeQuery.tab = 'schedule'

    const wrapper = await mountSuspended(CohortPage, defaultMocks)
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findComponent(UTabsStub)
    expect(tabs.props('modelValue')).toBe('schedule')
  })

  it('should update URL when tab is changed', async () => {
    fetchCohortMock.mockResolvedValue({ id: '123', name: 'Vue Course' })
    const wrapper = await mountSuspended(CohortPage, defaultMocks)
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findComponent(UTabsStub)
    await tabs.vm.$emit('update:modelValue', 'students')

    expect(replaceMock).toHaveBeenCalledWith({
      query: { tab: 'students' }
    })
  })

  it('should call refresh when refresh button is clicked', async () => {
    fetchCohortMock.mockResolvedValue({ id: '123', name: 'Vue Course' })
    const wrapper = await mountSuspended(CohortPage, defaultMocks)
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents(UButtonStub)
    const refreshBtn = buttons.find(b => b.props('icon') === 'i-lucide-refresh-cw')

    await refreshBtn?.vm.$emit('click')

    expect(refreshMock).toHaveBeenCalled()
  })

  it('should go back when back button is clicked', async () => {
    fetchCohortMock.mockResolvedValue({ id: '123', name: 'Vue Course' })
    const wrapper = await mountSuspended(CohortPage, defaultMocks)
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents(UButtonStub)
    const backBtn = buttons.find(b => b.props('icon') === 'i-lucide-arrow-left')

    expect(backBtn).toBeDefined()
    expect(backBtn?.exists()).toBe(true)

    await backBtn?.vm.$emit('click')

    expect(backMock).toHaveBeenCalled()
  })
})
