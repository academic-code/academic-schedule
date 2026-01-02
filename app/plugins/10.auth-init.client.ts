import { useAuthStore } from '@/stores/useAuthStore'

export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  await auth.init()
})
