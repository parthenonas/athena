import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import authMiddleware from '../auth.global'

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn()
}))

mockNuxtImport('navigateTo', () => navigateToMock)

const { useAuthStoreMock, setIsLogged, logoutMock } = vi.hoisted(() => {
  const isLogged = { value: false }
  const logoutMock = vi.fn()

  return {
    useAuthStoreMock: vi.fn(() => ({
      isLogged: isLogged.value,
      logout: logoutMock
    })),
    setIsLogged: (val: boolean) => { isLogged.value = val },
    logoutMock
  }
})

mockNuxtImport('useAuthStore', () => useAuthStoreMock)

const createRoute = (path: string) => ({ path } as any)

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setIsLogged(false)
  })

  it('GUEST: should allow access to public route "/"', async () => {
    const to = createRoute('/')
    await authMiddleware(to, createRoute('/from'))

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(logoutMock).not.toHaveBeenCalled()
  })

  it('GUEST: should call logout (and redirect inside store) from protected route "/admin"', async () => {
    const to = createRoute('/admin/users')
    await authMiddleware(to, createRoute('/'))

    expect(logoutMock).toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('GUEST: should call logout from protected route "/learn"', async () => {
    const to = createRoute('/learn/js')
    await authMiddleware(to, createRoute('/'))

    expect(logoutMock).toHaveBeenCalled()
  })

  it('USER: should redirect from guest route "/auth/login" to dashboard', async () => {
    setIsLogged(true)
    const to = createRoute('/auth/login')
    await authMiddleware(to, createRoute('/'))

    expect(navigateToMock).toHaveBeenCalledWith('/dashboard')
  })

  it('USER: should allow access to protected route "/admin"', async () => {
    setIsLogged(true)
    const to = createRoute('/admin')
    await authMiddleware(to, createRoute('/'))

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(logoutMock).not.toHaveBeenCalled()
  })
})
