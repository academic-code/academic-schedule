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

      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        this.user = null
        this.loading = false
        return
      }

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

      this.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        departmentId: profile.department_id,
        isActive: profile.is_active
      }

      if (!profile.is_active) {
        this.loading = false
        return
      }

      if (!profile.last_login_at) {
        const now = new Date().toISOString()

        const { error: updateError } = await supabase
          .from('users')
          .update({
            last_login_at: now
          })
          .eq('id', profile.id)

        if (!updateError) {
          await supabase.from('audit_logs').insert({
            user_id: profile.id,
            action: 'UPDATE',
            entity_type: 'USER',
            entity_id: profile.id,
            old_value: { last_login_at: null },
            new_value: {
              first_login: true,
              last_login_at: now
            }
          })

          this.user = {
            ...this.user,
            isActive: profile.is_active
          }
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

      if (this.user && !this.user.isActive) {
        await supabase.auth.signOut()
        throw new Error('Account is deactivated. Please contact administrator.')
      }

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