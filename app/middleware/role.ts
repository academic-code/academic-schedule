import { useAuthStore } from '@/stores/useAuthStore'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const allowed = to.meta.roles as string[] | undefined

  if (!allowed) return

  if (!auth.user || !allowed.includes(auth.user.role)) {
    return navigateTo('/')
  }
})
