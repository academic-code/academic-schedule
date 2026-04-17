import { useAuthStore } from '@/stores/useAuthStore'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  // ✅ allow explicitly public pages
  if (to.meta.public) return

  // ✅ fallback public routes
  if (to.path === '/login' || to.path === '/auth/set-password') return

  // ✅ wait for auth to finish initializing
  if (auth.loading) {
    await auth.init()
  }

  if (!auth.user) {
    return navigateTo('/login')
  }

  if (!auth.user.isActive) {
    return navigateTo('/login')
  }
})