import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RolesPage from '../roles.vue'
import { nextTick } from 'vue'

const { fetchRolesMock, deleteRoleMock, refreshMock } = vi.hoisted(() => ({
  fetchRolesMock: vi.fn(),
  deleteRoleMock: vi.fn(),
  refreshMock: vi.fn()
}))

vi.mock('@athena/types', () => ({
  Permission: {
    ADMIN: 'admin.access'
  }
}))

vi.mock('~/composables/useRoles', () => ({
  useRoles: () => ({
    fetchRoles: fetchRolesMock,
    deleteRole: deleteRoleMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

const UTableStub = {
  name: 'UTable',
  props: ['data', 'columns'],
  template: `
    <table>
      <tbody>
        <tr v-for="(row, index) in data" :key="index">
          <td>
            <slot name="actions-cell" :row="{ original: row }" />
          </td>
          <td>
             <slot name="permissions-cell" :row="{ original: row }" />
          </td>
        </tr>
      </tbody>
    </table>
  `
}

const AdminRolesSlideoverStub = {
  name: 'AdminRolesSlideover',
  template: '<div data-testid="slideover" />',
  props: ['modelValue', 'roleId'],
  emits: ['update:modelValue', 'refresh']
}

const ConfirmModalStub = {
  name: 'ConfirmModal',
  template: '<div data-testid="confirm-modal" />',
  props: ['open', 'loading'],
  emits: ['update:open', 'confirm']
}

const UButtonStub = {
  name: 'UButton',
  template: '<button @click="$emit(\'click\')">{{ label }}</button>',
  props: ['label', 'icon']
}

const mockRoles = [
  { id: '1', name: 'Admin', permissions: ['admin.access'], updatedAt: new Date().toISOString() },
  { id: '2', name: 'Editor', permissions: ['content.write'], updatedAt: new Date().toISOString() }
]

describe('Roles Page', () => {
  const defaultMocks = {
    global: {
      mocks: {
        $t: (key: string) => key
      },
      stubs: {
        UTable: UTableStub,
        AdminRolesSlideover: AdminRolesSlideoverStub,
        ConfirmModal: ConfirmModalStub,
        UButton: UButtonStub,
        UInput: { template: '<input />' },
        UBadge: { template: '<span>badge</span>' },
        UPagination: true
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    fetchRolesMock.mockResolvedValue({
      data: { value: { data: mockRoles, meta: { total: 2 } } },
      status: { value: 'success' },
      refresh: refreshMock
    })
  })

  it('should render and load data', async () => {
    const wrapper = await mountSuspended(RolesPage, defaultMocks)

    expect(fetchRolesMock).toHaveBeenCalled()
    expect(wrapper.text()).toContain('pages.roles.title')

    const table = wrapper.findComponent(UTableStub)
    expect(table.exists()).toBe(true)
    expect(table.findAll('tr').length).toBe(2)
  })

  it('should open Slideover for create role', async () => {
    const wrapper = await mountSuspended(RolesPage, defaultMocks)

    const createButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.roles.create')

    await createButton?.trigger('click')

    const slideover = wrapper.findComponent(AdminRolesSlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('roleId')).toBeNull()
  })

  it('should open Slideover for edit role', async () => {
    const wrapper = await mountSuspended(RolesPage, defaultMocks)
    const editButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-edit-2')

    await editButton?.trigger('click')

    const slideover = wrapper.findComponent(AdminRolesSlideoverStub)
    expect(slideover.props('modelValue')).toBe(true)
    expect(slideover.props('roleId')).toBe('1')
  })

  it('should open ConfirmModal for delete role', async () => {
    const wrapper = await mountSuspended(RolesPage, defaultMocks)
    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')

    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.props('open')).toBe(true)
  })

  it('should call deleteRole and refetch list on approve', async () => {
    const wrapper = await mountSuspended(RolesPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')
    await deleteButton?.trigger('click')
    const modal = wrapper.findComponent(ConfirmModalStub)
    modal.vm.$emit('confirm')

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(deleteRoleMock).toHaveBeenCalledWith('1')
    expect(refreshMock).toHaveBeenCalled()

    expect(modal.props('open')).toBe(false)
  })
})
