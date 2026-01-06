// app/stores/useSubjectStore.ts
import { defineStore } from "pinia"
import { useSupabase } from "@/composables/useSupabase"

export interface SubjectRow {
  id: string
  course_code: string
  description: string
  subject_type: "MAJOR" | "GENED" | "PE_NSTP"
  year_level: number
  semester: number
  lec_units: number
  lab_units: number
  total_units: number
  is_locked: boolean
  curriculum?: {
    id: string
    curriculum_code: string
    effective_year: number
  }
}

export interface SubjectPayload {
  curriculum_id: string
  course_code: string
  description: string
  subject_type: "MAJOR" | "GENED" | "PE_NSTP"
  year_level: number
  semester: number
  lec_units?: number
  lab_units?: number
}

export const useSubjectStore = defineStore("subjectStore", {
  state: () => ({
    subjects: [] as SubjectRow[],
    loading: false,
    saving: false,
    error: null as string | null,
    snackbar: {
      show: false,
      text: "",
      color: "success" as "success" | "error" | "info"
    }
  }),

  actions: {
    showSnackbar(text: string, color: "success" | "error" | "info" = "success") {
      this.snackbar = { show: true, text, color }
    },

    async getToken() {
      const { data } = await useSupabase().auth.getSession()
      if (!data.session?.access_token) throw new Error("Unauthorized")
      return data.session.access_token
    },

    async fetchSubjects(filters: any = {}) {
      this.loading = true
      try {
        const token = await this.getToken()
        this.subjects = await $fetch("/api/dean/subjects", {
          headers: { Authorization: `Bearer ${token}` },
          query: filters
        })
      } catch (e: any) {
        this.showSnackbar(e.message || "Failed to load subjects", "error")
      } finally {
        this.loading = false
      }
    },

    async createSubject(payload: SubjectPayload) {
      this.saving = true
      try {
        const token = await this.getToken()
        const created = await $fetch("/api/dean/subjects", {
          method: "POST",
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
        })
        this.subjects.push(created as any)
        this.showSnackbar("Subject created successfully")
      } catch (e: any) {
        this.showSnackbar(
          e?.status === 409
            ? "Duplicate subject in the same curriculum"
            : e.message,
          "error"
        )
        throw e
      } finally {
        this.saving = false
      }
    },

    async updateSubject(id: string, payload: Partial<SubjectPayload>) {
      this.saving = true
      try {
        const token = await this.getToken()
        const updated = await $fetch(`/api/dean/subjects/${id}`, {
          method: "PATCH",
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
        })
        const idx = this.subjects.findIndex((s) => s.id === id)
        if (idx !== -1) this.subjects[idx] = updated as any
        this.showSnackbar("Subject updated successfully")
      } catch (e: any) {
        this.showSnackbar(e.message || "Update failed", "error")
        throw e
      } finally {
        this.saving = false
      }
    },

    async deleteSubject(id: string) {
      try {
        const token = await this.getToken()
        await $fetch(`/api/dean/subjects/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })
        this.subjects = this.subjects.filter((s) => s.id !== id)
        this.showSnackbar("Subject deleted", "info")
      } catch (e: any) {
        this.showSnackbar(e.message || "Delete failed", "error")
      }
    }
  }
})
