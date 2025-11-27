import { loadUser } from '~/composables/useUser'

export default defineNuxtPlugin(async (nuxtApp) => {
  // wait until supabase plugin is initialized
  setTimeout(() => {
    loadUser()
  }, 0)
})
