import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QuotasSlideover from '../QuotasSlideover.vue'
import { nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

const {
  fetchRolesMock,
  fetchQuotasMock,
  refreshQuotasMock,
  setQuotaMock,
  deleteQuotaMock,
  formatBytesMock
} = vi.hoisted(() => ({
  fetchRolesMock: vi.fn(),
  fetchQuotasMock: vi.fn(),
  refreshQuotasMock: vi.fn(),
  setQuotaMock: vi.fn(),
  deleteQuotaMock: vi.fn(),
  formatBytesMock: vi.fn(bytes => `${bytes} B`)
}))

vi.mock('~/composables/useRoles', () => ({
  useRoles: () => ({
    fetchRoles: fetchRolesMock
  })
}))

vi.mock('~/composables/useMedia', () => ({
  useMedia: () => ({
    fetchQuotas: fetchQuotasMock,
    setQuota: setQuotaMock,
    deleteQuota: deleteQuotaMock,
    formatBytes: formatBytesMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

const USlideoverStub = {
  name: 'USlideover',
  template: `<div v-if="open" data-testid="slideover"><slot name="body" /><slot name="footer" /></div>`,
  props: ['open']
}

const UCardStub = {
  name: 'UCard',
  template: `<div data-testid="add-card"><slot /><div class="card-footer"><slot name="footer" /></div></div>`
}

const USelectMenuStub = {
  name: 'USelectMenu',
  template: `
    <div class="u-select-menu-stub">
      <input data-testid="role-search" :value="searchTerm" @input="$emit('update:search-term', $event.target.value)" />
      <div v-for="item in items" :key="item.id" class="role-option" @click="$emit('update:modelValue', item.label)">{{ item.label }}</div>
    </div>
  `,
  props: ['modelValue', 'items', 'searchTerm', 'loading'],
  emits: ['update:modelValue', 'update:search-term']
}

const UInputStub = {
  name: 'UInput',
  props: ['modelValue'],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', Number($event.target.value))" class="u-input-stub" />`
}

const UButtonStub = {
  name: 'UButton',
  props: ['label', 'icon', 'loading', 'disabled'],
  template: `<button @click="$emit('click')" :disabled="disabled" :class="{ loading }">{{ label }}</button>`
}

const UTableStub = {
  name: 'UTable',
  props: ['data'],
  template: `
    <table v-if="data && data.length">
      <tbody>
        <tr v-for="(row, index) in data" :key="index" class="quota-row">
          <td>{{ row.roleName }}</td>
          <td><slot name="limitBytes-cell" :row="{ original: row }" /></td>
          <td><slot name="actions-cell" :row="{ original: row }" /></td>
        </tr>
      </tbody>
    </table>
  `
}

const mockQuotasData = [
  { roleName: 'student', limitBytes: 104857600 }
]

const mockRolesData = [
  { id: '1', name: 'student' },
  { id: '2', name: 'teacher' }
]

describe('QuotasSlideover', () => {
  const defaultMocks = {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        USlideover: USlideoverStub,
        UCard: UCardStub,
        USelectMenu: USelectMenuStub,
        UInput: UInputStub,
        UButton: UButtonStub,
        UTable: UTableStub,
        UAlert: { template: '<div>alert</div>' },
        UFormField: { template: '<div><slot /></div>' },
        UTooltip: { template: '<div><slot /></div>' },
        UIcon: { template: '<i />' }
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    fetchQuotasMock.mockResolvedValue({
      data: ref(mockQuotasData),
      pending: ref(false),
      refresh: refreshQuotasMock
    })

    fetchRolesMock.mockResolvedValue({
      data: ref({ data: mockRolesData }),
      pending: ref(false)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const waitForLoad = async () => {
    await flushPromises()
    await nextTick()
  }

  it('should load quotas when opened', async () => {
    const wrapper = await mountSuspended(QuotasSlideover, {
      ...defaultMocks,
      props: { modelValue: false }
    })

    await wrapper.setProps({ modelValue: true })
    await waitForLoad()

    expect(fetchQuotasMock).toHaveBeenCalled()
    const rows = wrapper.findAll('.quota-row')
    expect(rows.length).toBe(1)
    expect(rows[0]!.text()).toContain('student')
  })

  it('should update quota when saving in table', async () => {
    const wrapper = await mountSuspended(QuotasSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })
    await waitForLoad()

    const tableInput = wrapper.findComponent(UInputStub)
    expect(tableInput.exists()).toBe(true)

    tableInput.vm.$emit('update:modelValue', 200)

    const saveButtons = wrapper.findAllComponents(UButtonStub).filter(b => b.props('icon') === 'i-lucide-save')
    expect(saveButtons.length).toBeGreaterThan(0)
    await saveButtons[0]!.trigger('click')

    const expectedBytes = 200 * 1024 * 1024
    expect(setQuotaMock).toHaveBeenCalledWith('student', expectedBytes)

    await waitForLoad()
    expect(refreshQuotasMock).toHaveBeenCalled()
  })

  it('should delete quota when clicking trash icon', async () => {
    const wrapper = await mountSuspended(QuotasSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })
    await waitForLoad()

    const deleteButtons = wrapper.findAllComponents(UButtonStub).filter(b => b.props('icon') === 'i-lucide-trash')
    expect(deleteButtons.length).toBeGreaterThan(0)
    await deleteButtons[0]!.trigger('click')

    expect(deleteQuotaMock).toHaveBeenCalledWith('student')

    await waitForLoad()
    expect(refreshQuotasMock).toHaveBeenCalled()
  })

  it('should show Add Form and search roles', async () => {
    vi.useFakeTimers()
    const wrapper = await mountSuspended(QuotasSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })
    await waitForLoad()

    const addBtn = wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'components.admin.quotas.add-rule')
    await addBtn?.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="add-card"]').exists()).toBe(true)

    const searchInput = wrapper.find('[data-testid="role-search"]')
    await searchInput.setValue('teac')
    vi.advanceTimersByTime(500)

    expect(fetchRolesMock).toHaveBeenCalledWith(expect.objectContaining({ search: 'teac' }))
  })

  it('should create new rule', async () => {
    const wrapper = await mountSuspended(QuotasSlideover, {
      ...defaultMocks,
      props: { modelValue: true }
    })
    await waitForLoad()

    const addBtn = wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'components.admin.quotas.add-rule')
    await addBtn?.trigger('click')
    await nextTick()

    const selectMenu = wrapper.findComponent(USelectMenuStub)
    selectMenu.vm.$emit('update:modelValue', 'teacher')
    await nextTick()

    const inputs = wrapper.findAllComponents(UInputStub)
    const limitInput = inputs[0]
    limitInput?.vm.$emit('update:modelValue', 500)
    await nextTick()

    const saveBtn = wrapper.findAllComponents(UButtonStub).find(b => b.props('label') === 'common.save')
    expect(saveBtn?.props('disabled')).toBeFalsy()

    await saveBtn?.trigger('click')

    const expectedBytes = 500 * 1024 * 1024
    expect(setQuotaMock).toHaveBeenCalledWith('teacher', expectedBytes)

    await waitForLoad()
    expect(refreshQuotasMock).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="add-card"]').exists()).toBe(false)
  })
})
