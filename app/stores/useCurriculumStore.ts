import { defineStore } from "pinia"
import { useSupabase } from "@/composables/useSupabase"

/* ================= TYPES ================= */

export interface Curriculum {
  id: string
  department_id: string
  program: string
  curriculum_code: string
  effective_year: number
  is_active: boolean
  is_locked: boolean
  subjects_count?: number
  created_at: string
}

/* ================= STORE ================= */

export const useCurriculumStore = defineStore("curriculumStore", {
  state: () => ({
    items: [] as Curriculum[],
    loading: false,
    saving: false,
    uploading: false,

    snackbar: {
      show: false,
      text: "",
      color: "success" as "success" | "error" | "info"
    }
  }),

  actions: {
    /* ---------- UI ---------- */

    show(text: string, color: "success" | "error" | "info" = "success") {
      this.snackbar = { show: true, text, color }
    },

    /* ---------- AUTH ---------- */

    async token() {
      const { data } = await useSupabase().auth.getSession()
      if (!data.session?.access_token) {
        throw new Error("Unauthorized")
      }
      return data.session.access_token
    },

    /* ---------- FETCH ---------- */

    async fetch() {
      this.loading = true
      try {
        const token = await this.token()
        this.items = await $fetch<Curriculum[]>("/api/dean/curriculums", {
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (e: any) {
        this.show(e.message || "Failed to load curriculums", "error")
      } finally {
        this.loading = false
      }
    },

    /* ---------- CREATE ---------- */

    async create(payload: {
      program: string
      curriculum_code: string
      effective_year: number
    }) {
      this.saving = true
      try {
        const token = await this.token()

        const created = await $fetch<Curriculum>(
          "/api/dean/curriculums",
          {
            method: "POST",
            body: payload,
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        this.items.unshift(created)
        this.show("Curriculum created successfully")
      } catch (e: any) {
        if (e?.status === 409) {
          this.show(
            `Curriculum "${payload.program} ${payload.curriculum_code}" already exists`,
            "error"
          )
        } else {
          this.show(e.message || "Create failed", "error")
        }
        throw e
      } finally {
        this.saving = false
      }
    },

    /* ---------- UPDATE ---------- */

    async update(id: string, payload: Partial<Curriculum>) {
      this.saving = true
      try {
        const token = await this.token()

        const updated = await $fetch<Curriculum>(
          `/api/dean/curriculums/${id}`,
          {
            method: "PATCH",
            body: payload,
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const idx = this.items.findIndex(c => c.id === id)
        if (idx !== -1) this.items[idx] = updated

        this.show("Curriculum updated successfully")
      } catch (e: any) {
        this.show(e.message || "Update failed", "error")
        throw e
      } finally {
        this.saving = false
      }
    },

    /* ---------- TOGGLE ACTIVE ---------- */

    async toggleActive(item: Curriculum) {
      try {
        const token = await this.token()

        const updated = await $fetch<Curriculum>(
          `/api/dean/curriculums/${item.id}`,
          {
            method: "PATCH",
            body: { is_active: item.is_active },
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const idx = this.items.findIndex(c => c.id === item.id)
        if (idx !== -1) this.items[idx] = updated

        this.show(
          updated.is_active
            ? "Curriculum activated"
            : "Curriculum deactivated",
          "info"
        )
      } catch (e: any) {
        // rollback UI
        item.is_active = !item.is_active
        this.show(e.message || "Failed to update status", "error")
      }
    },

    /* ---------- DELETE ---------- */

    async delete(id: string) {
      try {
        const token = await this.token()

        await $fetch(`/api/dean/curriculums/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })

        this.items = this.items.filter(c => c.id !== id)
        this.show("Curriculum deleted", "info")
      } catch (e: any) {
        this.show(e.message || "Cannot delete curriculum", "error")
        throw e
      }
    },

    /* ---------- CSV UPLOAD ---------- */

    async uploadCSV(curriculumId: string, file: File) {
      this.uploading = true
      try {
        const token = await this.token()

        const form = new FormData()
        form.append("file", file)

        await $fetch(
          `/api/dean/curriculums/${curriculumId}/upload-subjects`,
          {
            method: "POST",
            body: form,
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        this.show("Subjects uploaded successfully")
        await this.fetch()
      } catch (e: any) {
        this.show(e.message || "CSV upload failed", "error")
        throw e
      } finally {
        this.uploading = false
      }
    }
  }
})
