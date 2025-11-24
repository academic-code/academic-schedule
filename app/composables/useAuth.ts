// /app/composables/useAuth.ts
import { ref, computed, onBeforeUnmount } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

/**
 * useAuthComposable
 * - SSR-safe composable for Nuxt 4 that wraps Supabase Auth
 * - Tries to use Nuxt's useSupabaseClient() (if @nuxtjs/supabase module is installed)
 *   otherwise falls back to creating a client from runtimeConfig.
 *
 * Exposes:
 * - currentUser (ref<User | null>)
 * - userRole (ref<string | null>)
 * - departmentId (ref<string | null>)
 * - isGenEdDean (ref<boolean>)
 * - loading, error
 * - init()  -> must be awaited in middleware
 * - login(email,password), logout()
 * - getAccessToken(), getClaims()
 *
 * NOTE: If you rely on JWT custom claims, ensure your Supabase project's
 * authentication settings include user/app metadata in the JWT.
 */

// Path to uploaded curriculum file (for your reference)
export const CURRICULUM_FILE_PATH = '/mnt/data/CURRICULUM-Updated-2023-2024.docx'

type AuthState = {
  currentUser: Ref<User | null>
  userRole: Ref<string | null>
  departmentId: Ref<string | null>
  isGenEdDean: Ref<boolean>
  loading: Ref<boolean>
  error: Ref<string | null>
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<{ error?: any }>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  getClaims: () => Promise<Record<string, any> | null>
}

export function useAuthComposable(): AuthState {
  const currentUser = ref<User | null>(null)
  const userRole = ref<string | null>(null)
  const departmentId = ref<string | null>(null)
  const isGenEdDean = ref<boolean>(false)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Keep subscription reference to unsubscribe later
  let unsubscribe: (() => void) | null = null

  // Get supabase client:
  // Prefer Nuxt module's composable if available, otherwise create one.
  function getClient() {
    // @ts-ignore - useSupabaseClient may or may not be available depending on setup
    if (typeof useSupabaseClient === 'function') {
      try {
        // if module present this will return a properly configured client (SSR-enabled)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return useSupabaseClient()
      } catch (e) {
        // fall through to manual creation
      }
    }

    // Fallback: create a client from runtime config (server-safe)
    const config = useRuntimeConfig()
    const url = config.public?.SUPABASE_URL as string | undefined
    const anon = config.public?.SUPABASE_ANON_KEY as string | undefined
    if (!url || !anon) {
      throw new Error('Supabase client not available and runtime config is missing SUPABASE keys')
    }
    return createClient(url, anon)
  }

  const supabase = getClient()

  async function syncSessionToState(session: Session | null) {
    if (!session) {
      currentUser.value = null
      userRole.value = null
      departmentId.value = null
      isGenEdDean.value = false
      return
    }

    // session.user.user_metadata is the typical location for metadata
    const user = session.user as User
    currentUser.value = user

    // Prefer explicit user_metadata keys if present, otherwise try to decode token claims
    // user.user_metadata may be nested depending on your Supabase setup (app_metadata vs user_metadata)
    const meta = (user as any).user_metadata ?? (user as any).app_metadata ?? {}

    // The common claim names we agreed on:
    // role, department_id, is_gened_dean
    userRole.value = (meta.role ?? null) as string | null
    departmentId.value = (meta.department_id ?? null) as string | null
    isGenEdDean.value = (String(meta.is_gened_dean ?? '').toLowerCase() === 'true')

    // If metadata wasn't in user metadata, try to read from session access token claims (rare)
    if (!userRole.value) {
      try {
        const token = session.access_token
        if (token) {
          // decode payload (lightweight)
          const payload = JSON.parse(atob(token.split('.')[1]))
          userRole.value = payload?.role ?? null
          departmentId.value = payload?.department_id ?? null
          isGenEdDean.value = (String(payload?.is_gened_dean ?? '').toLowerCase() === 'true')
        }
      } catch (e) {
        // ignore decode errors
      }
    }
  }

  async function init() {
    loading.value = true
    error.value = null

    try {
      // Try to obtain session (works SSR/client with @nuxtjs/supabase)
      const { data, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) {
        // not fatal — continue
        // console.warn('auth.getSession error', sessErr)
      }
      await syncSessionToState(data?.session ?? null)

      // Subscribe to auth changes so UI updates automatically
      // supabase.auth.onAuthStateChange returns { subscription } in some SDK versions
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        // whenever auth changes update current user and metadata
        syncSessionToState(session ?? null)
      })

      // some SDK versions return subscription object, others return { subscription }
      // normalize unsubscribe function
      if (sub && typeof (sub as any).subscription?.unsubscribe === 'function') {
        unsubscribe = () => (sub as any).subscription.unsubscribe()
      } else if (sub && typeof (sub as any).unsubscribe === 'function') {
        unsubscribe = () => (sub as any).unsubscribe()
      } else if (typeof sub === 'function') {
        unsubscribe = sub as any
      } else {
        unsubscribe = null
      }
    } catch (err: any) {
      error.value = err?.message ?? String(err)
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const res = await supabase.auth.signInWithPassword({ email, password })
      if (res.error) {
        error.value = res.error.message
        return { error: res.error }
      }
      // sync session
      const { data } = await supabase.auth.getSession()
      await syncSessionToState(data?.session ?? null)
      return { error: null }
    } catch (err: any) {
      error.value = err?.message ?? String(err)
      return { error: err }
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    error.value = null
    try {
      await supabase.auth.signOut()
      currentUser.value = null
      userRole.value = null
      departmentId.value = null
      isGenEdDean.value = false
    } catch (err: any) {
      error.value = err?.message ?? String(err)
    } finally {
      loading.value = false
    }
  }

  async function getAccessToken(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession()
      return data?.session?.access_token ?? null
    } catch {
      return null
    }
  }

  async function getClaims(): Promise<Record<string, any> | null> {
    // prefer user_metadata
    const sessionResp = await supabase.auth.getSession()
    const sess = sessionResp?.data?.session
    if (!sess) return null
    const user = sess.user as any
    const meta = user.user_metadata ?? user.app_metadata ?? null
    if (meta) return meta
    // fallback: decode jwt claims
    const token = sess.access_token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload
    } catch {
      return null
    }
  }

  // make sure subscription is removed when component using composable is unmounted
  onBeforeUnmount(() => {
    if (unsubscribe) {
      try {
        unsubscribe()
      } catch {
        /* ignore */
      }
      unsubscribe = null
    }
  })

  return {
    currentUser,
    userRole,
    departmentId,
    isGenEdDean,
    loading,
    error,
    init,
    login,
    logout,
    getAccessToken,
    getClaims
  }
}
