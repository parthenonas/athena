export default defineNuxtRouteMiddleware((to) => {
  const requiredPermission = getRequiredPermissionForPath(to.path)

  if (!requiredPermission) return

  const { can } = useAcl()

  if (!can(requiredPermission)) {
    return abortNavigation({
      statusCode: 403,
      statusMessage: 'Forbidden.'
    })
  }
})
