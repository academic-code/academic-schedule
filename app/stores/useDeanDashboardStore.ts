import { defineStore } from "pinia"
import { useSupabase } from "@/composables/useSupabase"

/* ================= TYPES ================= */

export interface DeanDepartment {
  id: string
  name: string
  department_type: "REGULAR" | "GENED" | "PE_NSTP"
}

export interface DeanInfo {
  id: string
  email: string
  full_name: string
}

export interface AcademicTerm {
  id: string | null
  academic_year: string | null
  semester: number | null
  is_active: boolean
  is_locked?: boolean
}

export interface DashboardStats {
  classes: number
  subjects: number
  faculty: number
  draft_schedules: number
  published_schedules: number
}

export interface DashboardWarnings {
  unassigned_classes: number
  inactive_faculty: number
  locked_subjects: number
}

export interface DashboardNotification {
  id: string
  title: string
  message: string
  created_at: string
}

export interface DashboardActivity {
  action: string
  entity_type: string
  created_at: string
}

export interface DeanDashboardResponse {
  dean: DeanInfo
  department: DeanDepartment
  academic_term: AcademicTerm
  stats: DashboardStats
  warnings: DashboardWarnings
  notifications: DashboardNotification[]
  recent_activity: DashboardActivity[]
}

/* ================= STORE ================= */

export const useDeanDashboardStore = defineStore("deanDashboard", {
  state: () => ({
    dean: null as DeanInfo | null,
    department: null as DeanDepartment | null,

    academicTerm: {
      id: null,
      academic_year: null,
      semester: null,
      is_active: false,
      is_locked: false
    } as AcademicTerm,

    stats: {
      classes: 0,
      subjects: 0,
      faculty: 0,
      draft_schedules: 0,
      published_schedules: 0
    } as DashboardStats,

    warnings: {
      unassigned_classes: 0,
      inactive_faculty: 0,
      locked_subjects: 0
    } as DashboardWarnings,

    notifications: [] as DashboardNotification[],
    recentActivity: [] as DashboardActivity[],

    loading: false,
    error: null as string | null
  }),

  getters: {
    hasActiveTerm: (state) => state.academicTerm.is_active,
    hasWarnings: (state) =>
      state.warnings.unassigned_classes > 0 ||
      state.warnings.inactive_faculty > 0 ||
      state.warnings.locked_subjects > 0
  },

  actions: {
    async fetchDashboard() {
      if (this.loading) return
      this.loading = true
      this.error = null

      try {
        const supabase = useSupabase()
        const { data } = await supabase.auth.getSession()

        if (!data.session?.access_token) {
          throw new Error("No active session")
        }

        const res = await $fetch<DeanDashboardResponse>(
          "/api/dean/dashboard",
          {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`
            }
          }
        )

        this.dean = res.dean
        this.department = res.department
        this.academicTerm = res.academic_term
        this.stats = res.stats
        this.warnings = res.warnings
        this.notifications = res.notifications
        this.recentActivity = res.recent_activity
      } catch (err: any) {
        this.error = err?.message || "Failed to load dashboard"
      } finally {
        this.loading = false
      }
    },

    refresh() {
      return this.fetchDashboard()
    }
  }
})
