// app/stores/useScheduleStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSupabase } from '@/composables/useSupabase'

export type ViewMode = 'CLASS' | 'TEACHER'
export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'
export type ScheduleMode = 'F2F' | 'ONLINE' | 'ASYNC'
export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface ScheduleRow {
  id: string
  academic_term_id: string
  owner_department_id: string
  target_department_id: string
  department_id: string // still exists (matches target by CHECK)
  class_id: string | null
  subject_id: string
  faculty_id: string | null
  room_id: string | null
  day: WeekDay
  start_period_id: string
  end_period_id: string
  mode: ScheduleMode
  status: ScheduleStatus
  created_by: string | null
  created_at: string
}

export interface SaveResult {
  success: boolean
  schedule?: ScheduleRow
  conflicts?: any[]
}

export const useScheduleStore = defineStore('schedule2', () => {
  const supabase = useSupabase()

  const termId = ref<string | null>(null)
  const schedules = ref<ScheduleRow[]>([])
  const loading = ref(false)
  const lastError = ref<string | null>(null)

  const activeSchedules = computed(() =>
    schedules.value.filter(s => s.status !== 'ARCHIVED')
  )

  async function authHeaders(): Promise<Record<string, string>> {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session?.access_token) {
      throw new Error('No active session')
    }
    return { Authorization: `Bearer ${data.session.access_token}` }
  }

  async function fetchList(activeTermId: string) {
    if (!activeTermId) return
    if (termId.value === activeTermId && schedules.value.length) return

    termId.value = activeTermId
    loading.value = true
    lastError.value = null

    try {
      const headers = await authHeaders()

      const res = await $fetch<ScheduleRow[]>('/api/schedules/list', {
        method: 'GET',
        headers,
        query: { term_id: activeTermId }
      })

      schedules.value = res ?? []
    } catch (err: any) {
      lastError.value = err?.data?.message || err?.message || 'Failed to load schedules'
    } finally {
      loading.value = false
    }
  }

  async function saveSchedule(payload: any): Promise<SaveResult> {
    lastError.value = null

    try {
      const headers = await authHeaders()

      const res = await $fetch<SaveResult>('/api/schedules/save', {
        method: 'POST',
        headers,
        body: payload
      })

      return res
    } catch (err: any) {
      lastError.value = err?.data?.message || err?.message || 'Save failed'
      throw err
    }
  }

  async function deleteSchedule(scheduleId: string) {
    lastError.value = null

    try {
      const headers = await authHeaders()

      await $fetch('/api/schedules/delete', {
        method: 'POST',
        headers,
        body: { schedule_id: scheduleId }
      })
    } catch (err: any) {
      lastError.value = err?.data?.message || err?.message || 'Delete failed'
      throw err
    }
  }

  async function archiveSchedule(scheduleId: string) {
    lastError.value = null

    try {
      const headers = await authHeaders()

      await $fetch('/api/schedules/archive', {
        method: 'POST',
        headers,
        body: { schedule_id: scheduleId }
      })
    } catch (err: any) {
      lastError.value = err?.data?.message || err?.message || 'Archive failed'
      throw err
    }
  }

  async function undoSchedule(auditLogId: string) {
    lastError.value = null

    try {
      const headers = await authHeaders()

      await $fetch('/api/schedules/undo', {
        method: 'POST',
        headers,
        body: { audit_log_id: auditLogId }
      })
    } catch (err: any) {
      lastError.value = err?.data?.message || err?.message || 'Undo failed'
      throw err
    }
  }

  function reset() {
    termId.value = null
    schedules.value = []
    loading.value = false
    lastError.value = null
  }

  return {
    // state
    termId,
    schedules,
    activeSchedules,
    loading,
    lastError,

    // actions
    fetchList,
    saveSchedule,
    deleteSchedule,
    archiveSchedule,
    undoSchedule,
    reset
  }
})