// /app/middleware/auth.global.ts  (or admin.global.ts — update the file you use)
import { loadUser, currentRole } from '~/composables/useUser'

export default defineNuxtRouteMiddleware(async (to) => {
  // Allow these routes (including query params)
  if (
    to.path.startsWith('/welcome') ||
    to.path.startsWith('/login') ||
    to.path.startsWith('/forgot-password') ||
    to.path.startsWith('/reset-password')
  ) {
    return
  }

  // If server-side, skip checking (can't access client session/server-only flow)
  if (process.server) {
    return
  }

  // Client-side: try to load user session
  await loadUser()

  if (!currentRole.value) {
    return navigateTo('/login')
  }
})
