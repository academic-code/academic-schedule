import { defineStore } from 'pinia'
import { useSupabase } from '@/composables/useSupabase'

interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'DEAN' | 'FACULTY'
  departmentId: string | null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthUser | null,
    loading: true
  }),

  actions: {
    async init() {
      const supabase = useSupabase()

      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        this.user = null
        this.loading = false
        return
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('id, email, role, department_id')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Auth profile error:', error)
        this.user = null
      } else {
        this.user = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          departmentId: profile.department_id
        }
      }

      this.loading = false
    },

    async signIn(email: string, password: string) {
      const supabase = useSupabase()

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      await this.init()
    },

    async signOut() {
      const supabase = useSupabase()
      await supabase.auth.signOut()
      this.user = null
    }
  }
})
