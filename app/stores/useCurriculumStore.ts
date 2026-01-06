import { defineStore } from "pinia"
import { useSupabase } from "@/composables/useSupabase"

export interface Curriculum {
  id: string
  program: string
  curriculum_code: string
  effective_year: number
  is_active: boolean
  created_at: string
}

export const useCurriculumStore = defineStore("curriculumStore", {
  state: () => ({
    items: [] as Curriculum[],
    loading: false,
    snackbar: {
      show: false,
      text: "",
      color: "success" as "success" | "error" | "info"
    }
  }),

  actions: {
    show(text: string, color: "success" | "error" | "info" = "success") {
      this.snackbar = { show: true, text, color }
    },

    async token() {
      const { data } = await useSupabase().auth.getSession()
      if (!data.session?.access_token) throw new Error("Unauthorized")
      return data.session.access_token
    },

    async fetch() {
      this.loading = true
      try {
        const token = await this.token()
        this.items = await $fetch<Curriculum[]>("/api/dean/curriculums", {
          headers: { Authorization: `Bearer ${token}` }
        })
      } finally {
        this.loading = false
      }
    },

    async create(payload: any) {
      try {
        const token = await this.token()
        const created = await $fetch<Curriculum>("/api/dean/curriculums", {
          method: "POST",
          body: payload,
          headers: { Authorization: `Bearer ${token}` }
        })
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
      }
    },

    async update(id: string, payload: any) {
      const token = await this.token()
      const updated = await $fetch<Curriculum>(`/api/dean/curriculums/${id}`, {
        method: "PATCH",
        body: payload,
        headers: { Authorization: `Bearer ${token}` }
      })
      const idx = this.items.findIndex((c) => c.id === id)
      if (idx !== -1) this.items[idx] = updated
      this.show("Curriculum updated")
    },

    async delete(id: string) {
      try {
        const token = await this.token()
        await $fetch(`/api/dean/curriculums/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })
        this.items = this.items.filter((c) => c.id !== id)
        this.show("Curriculum deleted", "info")
      } catch (e: any) {
        this.show(e.message || "Cannot delete curriculum", "error")
        throw e
      }
    },

    async uploadCSV(curriculumId: string, file: File) {
      const token = await this.token()
      const form = new FormData()
      form.append("file", file)

      await $fetch(`/api/dean/curriculums/${curriculumId}/upload-subjects`, {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${token}` }
      })

      this.show("Subjects uploaded successfully")
    }
  }
})
