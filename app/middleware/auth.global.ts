import { useAuthComposable } from '@/composables/useAuth'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthComposable()
  await auth.init()

  if (to.path === '/reset-password') return

  if (!auth.currentUser.value && to.path !== '/login') {
    return navigateTo('/login')
  }

  if (to.path === '/login' && auth.currentUser.value) {
    if (auth.userRole.value === 'ADMIN') return navigateTo('/admin/dashboard')
    if (auth.userRole.value === 'DEAN') return navigateTo('/dean/dashboard')
    if (auth.userRole.value === 'FACULTY') return navigateTo('/faculty/schedules')
  }
})
