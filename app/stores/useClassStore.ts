import { defineStore } from "pinia"
import { useSupabase } from "@/composables/useSupabase"

/* ================= TYPES ================= */

export interface ClassRow {
  id: string
  program: string
  year_level: number
  section: string
  adviser?: {
    id: string
    first_name: string
    last_name: string
  } | null
  remarks?: string | null
  status: "NO_SCHEDULE" | "DRAFT" | "PUBLISHED" | "LOCKED"
}

export interface ClassFormPayload {
  program: string
  year_level: number
  section: string
  adviser_id?: string | null
  remarks?: string | null
}

/* ================= STORE ================= */

export const useClassStore = defineStore("classStore", {
  state: () => ({
    classes: [] as ClassRow[],

    loading: false,
    saving: false,
    deleting: false,

    error: null as string | null,

    snackbar: {
      show: false,
      text: "",
      color: "success" as "success" | "error" | "info"
    }
  }),

  getters: {
    hasClasses: (state) => state.classes.length > 0
  },

  actions: {
    /* ---------- UI ---------- */

    showSnackbar(
      text: string,
      color: "success" | "error" | "info" = "success"
    ) {
      this.snackbar = { show: true, text, color }
    },

    clearSnackbar() {
      this.snackbar.show = false
    },

    /* ---------- AUTH ---------- */

    async getAccessToken(): Promise<string> {
      const supabase = useSupabase()
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session?.access_token) {
        throw new Error("No active session")
      }

      return data.session.access_token
    },

    /* ---------- FETCH ---------- */

    async fetchClasses() {
      if (this.loading) return
      this.loading = true
      this.error = null

      try {
        const token = await this.getAccessToken()

        this.classes = await $fetch<ClassRow[]>("/api/dean/classes", {
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err: any) {
        this.error = err?.message || "Failed to load classes"
      } finally {
        this.loading = false
      }
    },

    /* ---------- CREATE ---------- */

    async createClass(payload: ClassFormPayload) {
      this.saving = true
      this.error = null

      try {
        const token = await this.getAccessToken()

        await $fetch("/api/dean/classes", {
          method: "POST",
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
        })

        // ✅ SINGLE SOURCE OF TRUTH
        await this.fetchClasses()
        this.showSnackbar("Class created successfully")
      } catch (err: any) {
        const message =
          err?.data?.message ||
          err?.message ||
          "Failed to create class"

        this.showSnackbar(message, "error")
        throw err
      } finally {
        this.saving = false
      }
    },

    /* ---------- UPDATE ---------- */

    async updateClass(id: string, payload: Partial<ClassFormPayload>) {
      this.saving = true
      this.error = null

      try {
        const token = await this.getAccessToken()

        await $fetch(`/api/dean/classes/${id}`, {
          method: "PATCH",
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
        })

        // ✅ SINGLE SOURCE OF TRUTH
        await this.fetchClasses()
        this.showSnackbar("Class updated successfully")
      } catch (err: any) {
        const message = err?.message || "Failed to update class"
        this.showSnackbar(message, "error")
        throw err
      } finally {
        this.saving = false
      }
    },

    /* ---------- DELETE ---------- */

    async deleteClass(id: string) {
      this.deleting = true
      this.error = null

      try {
        const token = await this.getAccessToken()

        await $fetch(`/api/dean/classes/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })

        // ✅ SINGLE SOURCE OF TRUTH
        await this.fetchClasses()
        this.showSnackbar("Class deleted successfully", "info")
      } catch (err: any) {
        const message = err?.message || "Failed to delete class"
        this.showSnackbar(message, "error")
        throw err
      } finally {
        this.deleting = false
      }
    },

    /* ---------- REALTIME ---------- */

    bindRealtime() {
      const supabase = useSupabase()

      return supabase
        .channel("classes-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "classes" },
          () => {
            this.fetchClasses()
          }
        )
        .subscribe()
    },

    /* ---------- CLEANUP ---------- */

    clear() {
      this.classes = []
      this.loading = false
      this.saving = false
      this.deleting = false
      this.error = null
      this.clearSnackbar()
    }
  }
})
