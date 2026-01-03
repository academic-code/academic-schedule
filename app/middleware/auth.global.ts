import { useAuthStore } from '@/stores/useAuthStore'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  if (auth.loading) return

  // Public routes
  if (to.path === '/login') return

  if (!auth.user) {
    return navigateTo('/login')
  }

  if (auth.user && !auth.user.isActive) {
  return navigateTo('/login')
}

})
