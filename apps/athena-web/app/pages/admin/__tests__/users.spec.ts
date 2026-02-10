import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UsersPage from '../users.vue'
import { nextTick } from 'vue'
import { Status } from '@athena/types'

const { fetchAccountsMock,
  deleteAccountMock,
  refreshMock,
  fetchAccountMock,
  fetchProfileMock,
  createProfileMock,
  updateProfileMock } = vi.hoisted(() => ({
  fetchAccountsMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  refreshMock: vi.fn(),
  fetchAccountMock: vi.fn(),
  fetchProfileMock: vi.fn(),
  createProfileMock: vi.fn(),
  updateProfileMock: vi.fn()
}))

vi.mock('@athena/types', () => ({
  Status: {
    Active: 'active',
    Blocked: 'blocked',
    TemporaryBlocked: 'temporary_blocked'
  }
}))

vi.mock('~/composables/useAccounts', () => ({
  useAccounts: () => ({
    fetchAccounts: fetchAccountsMock,
    deleteAccount: deleteAccountMock,
    fetchAccount: fetchAccountMock
  })
}))

vi.mock('~/composables/useProfiles', () => ({
  useAccounts: () => ({
    fetchProfile: fetchProfileMock,
    createProfile: createProfileMock,
    updateProfile: updateProfileMock
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

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
        <tr v-for="(row, index) in data" :key="index">
          <td>
             <slot name="roleId-cell" :row="{ original: row }" />
          </td>
          
          <td>
             <slot name="status-cell" :row="{ original: row }" />
          </td>

          <td>
            <slot name="actions-cell" :row="{ original: row }" />
          </td>
        </tr>
      </tbody>
    </table>
  `
}

const AdminRoleBadgeStub = {
  name: 'AdminRoleBadge',
  template: '<div data-testid="role-badge">{{ roleId }}</div>',
  props: ['roleId']
}

const SlideoverStub = {
  name: 'AdminAccountsSlideover',
  template: '<div data-testid="slideover" />',
  props: ['modelValue', 'accountId']
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

const mockAccounts = [
  {
    id: '1',
    login: 'user_active',
    status: Status.Active,
    roleId: 'role_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    login: 'user_blocked',
    status: Status.Blocked,
    roleId: 'role_2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

describe('Accounts (Users) Page', () => {
  const defaultMocks = {
    global: {
      mocks: {
        $t: (key: string) => key
      },
      stubs: {
        UTable: UTableStub,
        AdminRoleBadge: AdminRoleBadgeStub,
        ConfirmModal: ConfirmModalStub,
        AdminAccountsSlideover: SlideoverStub,
        UButton: UButtonStub,
        UInput: UInputStub,
        UBadge: { template: '<span class="badge">{{ label }}</span>', props: ['label'] },
        UPagination: true
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    fetchAccountsMock.mockResolvedValue({
      data: { value: { data: mockAccounts, meta: { total: 2 } } },
      status: { value: 'success' },
      refresh: refreshMock
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render table and role badges', async () => {
    const wrapper = await mountSuspended(UsersPage, defaultMocks)

    expect(fetchAccountsMock).toHaveBeenCalled()
    expect(wrapper.text()).toContain('pages.accounts.title')

    const table = wrapper.findComponent(UTableStub)
    expect(table.exists()).toBe(true)
    expect(table.findAll('tr').length).toBe(2)

    const roleBadges = wrapper.findAllComponents(AdminRoleBadgeStub)
    expect(roleBadges.length).toBe(2)
    expect(roleBadges[0]!.props('roleId')).toBe('role_1')
  })

  it('should render correct status badges', async () => {
    const wrapper = await mountSuspended(UsersPage, defaultMocks)

    const badges = wrapper.findAll('.badge')
    expect(badges[0]!.text()).toBe('statuses.active')
    expect(badges[1]!.text()).toBe('statuses.blocked')
  })

  it('should handle create button click', async () => {
    const wrapper = await mountSuspended(UsersPage, defaultMocks)

    const createButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('label') === 'pages.accounts.create')

    await createButton?.trigger('click')

    expect((wrapper.vm as any).isSlideoverOpen).toBe(true)

    expect((wrapper.vm as any).selectedAccountId).toBeNull()

    const slideover = wrapper.findComponent(SlideoverStub)
    expect(slideover.exists()).toBe(true)
    expect(slideover.props('modelValue')).toBe(true)
  })

  it('should handle edit button click', async () => {
    const wrapper = await mountSuspended(UsersPage, defaultMocks)

    const editButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-edit-2')

    await editButton?.trigger('click')

    expect((wrapper.vm as any).isSlideoverOpen).toBe(true)
    expect((wrapper.vm as any).selectedAccountId).toBe('1')
  })

  it('should open ConfirmModal for delete account', async () => {
    const wrapper = await mountSuspended(UsersPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')

    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    expect(modal.exists()).toBe(true)
    expect(modal.props('open')).toBe(true)
  })

  it('should call deleteAccount and refresh on confirm', async () => {
    const wrapper = await mountSuspended(UsersPage, defaultMocks)

    const deleteButton = wrapper.findAllComponents(UButtonStub)
      .find(b => b.props('icon') === 'i-lucide-trash')
    await deleteButton?.trigger('click')

    const modal = wrapper.findComponent(ConfirmModalStub)
    modal.vm.$emit('confirm')

    await nextTick()
    await vi.advanceTimersByTimeAsync(1)

    expect(deleteAccountMock).toHaveBeenCalledWith('1')
    expect(refreshMock).toHaveBeenCalled()
    expect(modal.props('open')).toBe(false)
  })

  it('should update filters with debounce when searching', async () => {
    const wrapper = await mountSuspended(UsersPage, defaultMocks)
    const input = wrapper.findComponent(UInputStub)
    await input.find('input').setValue('moderator')

    expect((wrapper.vm as any).search).toBe('moderator')

    expect((wrapper.vm as any).filters.search).toBe('')

    vi.advanceTimersByTime(500)

    expect((wrapper.vm as any).filters.search).toBe('moderator')
  })
})
