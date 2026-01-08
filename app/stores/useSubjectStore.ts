import { defineStore } from "pinia"
import { useSupabase } from "@/composables/useSupabase"

/* ================= TYPES ================= */

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
    program: string
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

export interface SubjectFilters {
  program?: string | null
  curriculum_id?: string | null
  year_level?: number | null
  semester?: number | null
  search?: string | null
}

/* ================= STORE ================= */

export const useSubjectStore = defineStore("subjectStore", {
  state: () => ({
    subjects: [] as SubjectRow[],
    curriculums: [] as any[],
    loading: false,
    saving: false,
    snackbar: {
      show: false,
      text: "",
      color: "success" as "success" | "error" | "info"
    }
  }),

  actions: {
    /* ---------- UI ---------- */

    showSnackbar(
      text: string,
      color: "success" | "error" | "info" = "success"
    ) {
      this.snackbar = { show: true, text, color }
    },

    /* ---------- AUTH ---------- */

    async token() {
      const { data } = await useSupabase().auth.getSession()
      if (!data.session?.access_token) throw new Error("Unauthorized")
      return data.session.access_token
    },

    /* ---------- CURRICULUM OPTIONS ---------- */

    async fetchCurriculums() {
      const token = await this.token()
      this.curriculums = await $fetch<any[]>("/api/dean/curriculums" as string, {
        headers: { Authorization: `Bearer ${token}` }
      })
    },

    /* ---------- FETCH SUBJECTS ---------- */

    async fetchSubjects(filters: SubjectFilters = {}) {
      this.loading = true
      try {
        const token = await this.token()
        this.subjects = await $fetch("/api/dean/subjects", {
          headers: { Authorization: `Bearer ${token}` },
          query: {
            program: filters.program ?? undefined,
            curriculum_id: filters.curriculum_id ?? undefined,
            year_level: filters.year_level ?? undefined,
            semester: filters.semester ?? undefined,
            search: filters.search ?? undefined
          }
        })
      } catch (e: any) {
        this.showSnackbar(e.message || "Failed to load subjects", "error")
      } finally {
        this.loading = false
      }
    },

    /* ---------- CREATE ---------- */

    async createSubject(payload: SubjectPayload) {
      this.saving = true
      try {
        const token = await this.token()
        const created = await $fetch("/api/dean/subjects", {
          method: "POST",
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
        })

        this.subjects.push(created as SubjectRow)
        this.showSnackbar("Subject created successfully")
      } catch (e: any) {
        if (e?.status === 409) {
          this.showSnackbar(
            `Duplicate subject: ${payload.course_code} already exists in Year ${payload.year_level}, Semester ${payload.semester}`,
            "error"
          )
        } else {
          this.showSnackbar(e.message || "Create failed", "error")
        }
        throw e
      } finally {
        this.saving = false
      }
    },

    /* ---------- UPDATE ---------- */

    async updateSubject(id: string, payload: Partial<SubjectPayload>) {
      this.saving = true
      try {
        const token = await this.token()
        const updated = await $fetch(`/api/dean/subjects/${id}`, {
          method: "PATCH",
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
        })

        const idx = this.subjects.findIndex(s => s.id === id)
        if (idx !== -1) this.subjects[idx] = updated as SubjectRow

        this.showSnackbar("Subject updated successfully")
      } catch (e: any) {
        if (e?.status === 409 && payload.course_code) {
          this.showSnackbar(
            `Duplicate subject detected: ${payload.course_code} already exists for the same year & semester.`,
            "error"
          )
        } else {
          this.showSnackbar(e.message || "Update failed", "error")
        }
        throw e
      } finally {
        this.saving = false
      }
    },

    /* ---------- DELETE ---------- */

    async deleteSubject(id: string) {
      try {
        const token = await this.token()
        await $fetch(`/api/dean/subjects/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })

        this.subjects = this.subjects.filter(s => s.id !== id)
        this.showSnackbar("Subject deleted", "info")
      } catch (e: any) {
        this.showSnackbar(e.message || "Delete failed", "error")
        throw e
      }
    }
  }
})
