export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  const guestPrefixes = ['/auth']
  const publicRoutes = ['/', '/docs']

  const isGuestRoute = guestPrefixes.some(prefix => to.path.startsWith(prefix))
  const isPublicRoute = publicRoutes.includes(to.path)

  if (authStore.isLogged && isGuestRoute) {
    return navigateTo('/dashboard')
  }

  if (!authStore.isLogged && !isGuestRoute && !isPublicRoute) {
    return navigateTo('/auth/login')
  }
})
