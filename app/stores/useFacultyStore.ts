import { defineStore } from "pinia"
import { useSupabase } from "@/composables/useSupabase"

/* ================= TYPES ================= */

export interface FacultyRow {
  id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  email: string
  faculty_type: "FULL_TIME" | "PART_TIME"
  is_active: boolean
  created_at: string
}

export interface FacultyPayload {
  email: string
  first_name: string
  last_name: string
  middle_name?: string | null
  faculty_type: "FULL_TIME" | "PART_TIME"
}

/* ================= STORE ================= */

export const useFacultyStore = defineStore("facultyStore", {
  state: () => ({
    faculty: [] as FacultyRow[],

    loading: false,
    saving: false,

    error: null as string | null,

    snackbar: {
      show: false,
      text: "",
      color: "success" as "success" | "error" | "info"
    }
  }),

  getters: {
    activeFaculty: (state) =>
      state.faculty.filter(f => f.is_active),

    inactiveFaculty: (state) =>
      state.faculty.filter(f => !f.is_active)
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

    async token(): Promise<string> {
      const { data, error } = await useSupabase().auth.getSession()

      if (error || !data.session?.access_token) {
        throw new Error("Unauthorized")
      }

      return data.session.access_token
    },

    /* ---------- FETCH ---------- */

    async fetchFaculty() {
      if (this.loading) return

      this.loading = true
      this.error = null

      try {
        const token = await this.token()

        this.faculty = await $fetch<FacultyRow[]>(
          "/api/dean/faculty",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
      } catch (err: any) {
        const message =
          err?.data?.message ||
          err?.message ||
          "Failed to load faculty"

        this.error = message
        this.showSnackbar(message, "error")
      } finally {
        this.loading = false
      }
    },

    /* ---------- CREATE ---------- */

    async createFaculty(payload: FacultyPayload) {
      this.saving = true
      this.error = null

      try {
        const token = await this.token()

        const created = await $fetch<FacultyRow>(
          "/api/dean/faculty",
          {
            method: "POST",
            body: payload,
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        this.faculty.unshift(created)
        this.showSnackbar("Faculty created successfully")
      } catch (err: any) {
        const message =
          err?.data?.message ||
          err?.message ||
          "Failed to create faculty"

        this.error = message
        this.showSnackbar(message, "error")
        throw err
      } finally {
        this.saving = false
      }
    },

    /* ---------- UPDATE ---------- */

    async updateFaculty(
      id: string,
      payload: Partial<Omit<FacultyPayload, "email">>
    ) {
      this.saving = true
      this.error = null

      try {
        const token = await this.token()

        const updated = await $fetch<FacultyRow>(
          `/api/dean/faculty/${id}`,
          {
            method: "PATCH",
            body: payload,
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const idx = this.faculty.findIndex(f => f.id === id)
        if (idx !== -1) {
          this.faculty[idx] = updated
        }

        this.showSnackbar("Faculty updated successfully")
      } catch (err: any) {
        const message =
          err?.data?.message ||
          err?.message ||
          "Failed to update faculty"

        this.error = message
        this.showSnackbar(message, "error")
        throw err
      } finally {
        this.saving = false
      }
    },

    /* ---------- ACTIVATE / DEACTIVATE ---------- */

    async toggleFaculty(id: string, isActive: boolean) {
      this.saving = true
      this.error = null

      try {
        const token = await this.token()

        const updated = await $fetch<FacultyRow>(
          `/api/dean/faculty/${id}`,
          {
            method: "PATCH",
            body: { is_active: isActive },
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const idx = this.faculty.findIndex(f => f.id === id)
        if (idx !== -1) {
          this.faculty[idx] = updated
        }

        this.showSnackbar(
          isActive
            ? "Faculty activated"
            : "Faculty deactivated",
          "info"
        )
      } catch (err: any) {
        const message =
          err?.data?.message ||
          err?.message ||
          "Failed to update faculty status"

        this.error = message
        this.showSnackbar(message, "error")
        throw err
      } finally {
        this.saving = false
      }
    },

    /* ---------- RESET ---------- */

    clear() {
      this.faculty = []
      this.loading = false
      this.saving = false
      this.error = null
      this.clearSnackbar()
    }
  }
})
