import { loadUser, currentRole } from '~/composables/useUser'

export default defineNuxtRouteMiddleware(async (to) => {
  const publicPages = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/welcome"
  ]

  if (publicPages.includes(to.path)) return

  await loadUser()

  if (!currentRole.value) return navigateTo("/login")
})
