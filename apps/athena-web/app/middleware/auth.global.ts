export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  const guestPrefixes = ['/auth']

  const protectedPrefixes = ['/admin', '/learn', '/studio', '/dashboard']

  const isGuestRoute = guestPrefixes.some(prefix => to.path.startsWith(prefix))

  if (authStore.isLogged && isGuestRoute) {
    return navigateTo('/dashboard')
  }

  const isProtectedRoute = protectedPrefixes.some(prefix => to.path.startsWith(prefix))

  if (!authStore.isLogged && isProtectedRoute) {
    return authStore.logout()
  }
})
