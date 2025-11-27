// /app/composables/useUser.ts
import { ref } from 'vue'
import { useNuxtApp } from '#app'

/* GLOBAL STATE */
export const currentUser = ref<any | null>(null)
export const currentRole = ref<string | null>(null)
export const loadingUser = ref(false)

/* Load session + user metadata */
export async function loadUser() {
  loadingUser.value = true

  try {
    // If running on server, skip — client will run loadUser later.
    if (process.server) {
      currentUser.value = null
      currentRole.value = null
      loadingUser.value = false
      return
    }

    const nuxtApp = useNuxtApp()
    // Supabase plugin exposes $supabase (client-only). Guard against missing plugin.
    const supabase = (nuxtApp && (nuxtApp as any).$supabase) ?? null

    if (!supabase) {
      // no supabase available (plugin not initialized yet) — treat as not logged in
      currentUser.value = null
      currentRole.value = null
      loadingUser.value = false
      return
    }

    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      currentUser.value = null
      currentRole.value = null
      loadingUser.value = false
      return
    }

    // User Auth Object
    const user = session.user

    currentUser.value = user
    currentRole.value = user.user_metadata?.role || null
  } catch (e) {
    console.error('loadUser error:', e)
    currentUser.value = null
    currentRole.value = null
  } finally {
    loadingUser.value = false
  }
}

/* Logout */
export async function logoutUser() {
  // logout should only be called from client
  if (process.server) return

  const nuxtApp = useNuxtApp()
  const supabase = (nuxtApp && (nuxtApp as any).$supabase) ?? null

  if (supabase) {
    await supabase.auth.signOut()
  }

  currentUser.value = null
  currentRole.value = null
}
