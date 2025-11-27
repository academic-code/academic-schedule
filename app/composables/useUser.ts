import { ref } from 'vue'
import { useSupabase } from '~/composables/useSupabase'

export const currentUser = ref<any | null>(null)
export const currentRole = ref<string | null>(null)
export const loadingUser = ref(false)

export async function loadUser() {
  const supabase = useSupabase()
  loadingUser.value = true

  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      currentUser.value = null
      currentRole.value = null
      loadingUser.value = false
      return
    }

    currentUser.value = session.user
    currentRole.value = session.user.user_metadata?.role ?? null
  } catch (e) {
    console.error('loadUser error:', e)
    currentUser.value = null
    currentRole.value = null
  }

  loadingUser.value = false
}

export async function logoutUser() {
  const supabase = useSupabase()
  await supabase.auth.signOut()
  currentUser.value = null
  currentRole.value = null
}
