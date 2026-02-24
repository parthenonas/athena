import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import authMiddleware from '../0.auth.global'

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn()
}))
mockNuxtImport('navigateTo', () => navigateToMock)

const { useAuthStoreMock, setIsLogged } = vi.hoisted(() => {
  let loggedIn = false
  return {

    useAuthStoreMock: vi.fn(() => ({
      get isLogged() { return loggedIn }
    })),
    setIsLogged: (val: boolean) => { loggedIn = val }
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
  })

  it('GUEST: should allow access to public route "/docs"', async () => {
    const to = createRoute('/docs')
    await authMiddleware(to, createRoute('/from'))
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('GUEST: should allow access to guest route "/auth/login"', async () => {
    const to = createRoute('/auth/login')
    await authMiddleware(to, createRoute('/from'))
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('GUEST: should redirect to "/auth/login" from unknown/protected route "/admin/users"', async () => {
    const to = createRoute('/admin/users')
    await authMiddleware(to, createRoute('/from'))
    expect(navigateToMock).toHaveBeenCalledWith('/auth/login')
  })

  it('GUEST: should redirect to "/auth/login" from unknown/protected route "/learn/js"', async () => {
    const to = createRoute('/learn/js')
    await authMiddleware(to, createRoute('/from'))
    expect(navigateToMock).toHaveBeenCalledWith('/auth/login')
  })

  it('USER: should redirect from guest route "/auth/login" to "/dashboard"', async () => {
    setIsLogged(true)
    const to = createRoute('/auth/login')
    await authMiddleware(to, createRoute('/from'))
    expect(navigateToMock).toHaveBeenCalledWith('/dashboard')
  })

  it('USER: should allow access to protected route "/admin/users"', async () => {
    setIsLogged(true)
    const to = createRoute('/admin/users')
    await authMiddleware(to, createRoute('/from'))
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('USER: should allow access to public route "/docs"', async () => {
    setIsLogged(true)
    const to = createRoute('/docs')
    await authMiddleware(to, createRoute('/from'))
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
