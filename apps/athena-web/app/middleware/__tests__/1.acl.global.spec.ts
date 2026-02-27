import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import aclMiddleware from '../1.acl.global'

const { abortNavigationMock } = vi.hoisted(() => ({
  abortNavigationMock: vi.fn()
}))
mockNuxtImport('abortNavigation', () => abortNavigationMock)

const { getRequiredPermissionForPathMock, setRequiredPermission } = vi.hoisted(() => {
  let requiredPerm: string | null = null
  return {
    getRequiredPermissionForPathMock: vi.fn(() => requiredPerm),
    setRequiredPermission: (val: string | null) => { requiredPerm = val }
  }
})
mockNuxtImport('getRequiredPermissionForPath', () => getRequiredPermissionForPathMock)

const { useAclMock, setCanAccess } = vi.hoisted(() => {
  let canAccess = false
  return {
    useAclMock: vi.fn(() => ({
      can: vi.fn(() => canAccess)
    })),
    setCanAccess: (val: boolean) => { canAccess = val }
  }
})
mockNuxtImport('useAcl', () => useAclMock)

const createRoute = (path: string) => ({ path } as any)

describe('ACL Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setRequiredPermission(null)
    setCanAccess(false)
  })

  it('should allow access if route does not require any permission', async () => {
    setRequiredPermission(null)
    const to = createRoute('/public-page')

    await aclMiddleware(to, createRoute('/from'))

    expect(getRequiredPermissionForPathMock).toHaveBeenCalledWith('/public-page')
    expect(abortNavigationMock).not.toHaveBeenCalled()
  })

  it('should allow access if user HAS the required permission', async () => {
    setRequiredPermission('admin')
    setCanAccess(true)
    const to = createRoute('/admin/settings')

    await aclMiddleware(to, createRoute('/from'))

    expect(getRequiredPermissionForPathMock).toHaveBeenCalledWith('/admin/settings')
    expect(abortNavigationMock).not.toHaveBeenCalled()
  })

  it('should abort navigation with 403 if user DOES NOT HAVE the required permission', async () => {
    setRequiredPermission('admin')
    setCanAccess(false)
    const to = createRoute('/admin/settings')

    await aclMiddleware(to, createRoute('/from'))

    expect(abortNavigationMock).toHaveBeenCalledWith({
      statusCode: 403,
      statusMessage: 'Forbidden.'
    })
  })
})
