import { loadUser, currentRole } from '~/composables/useUser'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith("/admin")) return

  await loadUser()

  if (currentRole.value !== "ADMIN") {
    return navigateTo("/login")
  }
})
