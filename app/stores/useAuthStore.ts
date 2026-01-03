import { defineStore } from 'pinia'
import { useSupabase } from '@/composables/useSupabase'

interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'DEAN' | 'FACULTY'
  departmentId: string | null
  isActive: boolean
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    loading: true
  }),

  actions: {
    async init() {
      const supabase = useSupabase()
      this.loading = true

      // 1️⃣ Get session
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        this.user = null
        this.loading = false
        return
      }

      // 2️⃣ Load profile
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          role,
          department_id,
          is_active,
          last_login_at
        `)
        .eq('id', session.user.id)
        .single()

      if (error || !profile) {
        console.error('Auth profile error:', error)
        this.user = null
        this.loading = false
        return
      }

      // ==================================================
      // ✅ AUTO-ACTIVATE + FIRST LOGIN AUDIT (HERE)
      // ==================================================
   if (!profile.last_login_at) {
  await supabase
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      is_active: true
    })
    .eq('id', profile.id)

  await supabase.from('audit_logs').insert({
    user_id: profile.id,
    action: 'LOGIN',
    entity_type: 'USER',
    entity_id: profile.id,
    new_value: { first_login: true }
  })

  // 🔑 IMPORTANT: update local copy
  profile.last_login_at = new Date().toISOString()
  profile.is_active = true
}


      // 3️⃣ Save to store
      this.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        departmentId: profile.department_id,
        isActive: profile.is_active
      }

      this.loading = false
    },

async signIn(email: string, password: string) {
  const supabase = useSupabase()

  // 1️⃣ Auth with Supabase
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  // 2️⃣ Load profile + auto-activate logic
  await this.init()

  // 3️⃣ 🔒 BLOCK INACTIVE USERS (THIS IS THE CODE YOU ASKED ABOUT)
  if (this.user && !this.user.isActive) {
    await supabase.auth.signOut()
    throw new Error('Account is deactivated. Please contact administrator.')
  }

  // 4️⃣ Role-based redirect (unchanged)
  if (this.user?.role === 'ADMIN') return navigateTo('/admin/dashboard')
  if (this.user?.role === 'DEAN') return navigateTo('/dean/dashboard')
  if (this.user?.role === 'FACULTY') return navigateTo('/faculty/schedule')
},


    async signOut() {
      const supabase = useSupabase()
      await supabase.auth.signOut()
      this.user = null
    }
  }
})
