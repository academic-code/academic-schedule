import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useFetch } from '#app'

export const useScheduleStore = defineStore('schedule', () => {
  /* ================================
   * SUPABASE CLIENT
   * ================================ */
  const supabase = useSupabase()

  /* ================================
   * STATE
   * ================================ */
  const schedules = ref<any[]>([])
  const activeTermId = ref<string | null>(null)
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  let realtimeChannel: any = null

  /* ================================
   * GETTERS
   * ================================ */
  const publishedSchedules = computed(() =>
    schedules.value.filter(s => s.status === 'PUBLISHED')
  )

  const schedulesByClass = (classId: string) =>
    publishedSchedules.value.filter(s => s.class_id === classId)

  const schedulesByFaculty = (facultyId: string) =>
    publishedSchedules.value.filter(s => s.faculty_id === facultyId)

  const schedulesByRoom = (roomId: string) =>
    publishedSchedules.value.filter(s => s.room_id === roomId)

  /* ================================
   * FETCH (TERM-SCOPED)
   * ================================ */
  async function fetchSchedules(termId: string) {
    if (!termId) return
    if (activeTermId.value === termId && schedules.value.length) return

    reset()
    isLoading.value = true
    activeTermId.value = termId

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('academic_term_id', termId)

    if (error) {
      lastError.value = error.message
      isLoading.value = false
      return
    }

    schedules.value = data ?? []
    isLoading.value = false

    subscribeRealtime(termId)
  }

  /* ================================
   * SAVE (CREATE / UPDATE / PUBLISH)
   * ================================ */
  async function saveSchedule(payload: any) {
    lastError.value = null

    const { data, error } = await useFetch<{ success?: boolean; [key: string]: any }>('/api/schedules/save', {
      method: 'POST',
      body: payload
    })

    if (error.value) {
      lastError.value = error.value.message
      throw error.value
    }

    if (data.value?.success === false) {
      // conflict response (expected shape)
      return data.value
    }

    return data.value
  }

  /* ================================
   * ARCHIVE
   * ================================ */
  async function archiveSchedule(scheduleId: string) {
    lastError.value = null

    const { error } = await useFetch('/api/schedules/archive', {
      method: 'POST',
      body: { schedule_id: scheduleId }
    })

    if (error.value) {
      lastError.value = error.value.message
      throw error.value
    }
  }

  /* ================================
   * DELETE (DRAFT ONLY)
   * ================================ */
  async function deleteSchedule(scheduleId: string) {
    lastError.value = null

    const { error } = await useFetch('/api/schedules/delete', {
      method: 'POST',
      body: { schedule_id: scheduleId }
    })

    if (error.value) {
      lastError.value = error.value.message
      throw error.value
    }
  }

  /* ================================
   * UNDO (ARCHIVED ONLY)
   * ================================ */
  async function undoSchedule(auditLogId: string) {
    lastError.value = null

    const { error } = await useFetch('/api/schedules/undo', {
      method: 'POST',
      body: { audit_log_id: auditLogId }
    })

    if (error.value) {
      lastError.value = error.value.message
      throw error.value
    }
  }

  /* ================================
   * REALTIME (AUTHORITATIVE)
   * ================================ */
  function subscribeRealtime(termId: string) {
    unsubscribeRealtime()

    realtimeChannel = supabase
      .channel(`schedules:${termId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `academic_term_id=eq.${termId}`
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            if (!schedules.value.find(s => s.id === payload.new.id)) {
              schedules.value.push(payload.new)
            }
          }

          if (payload.eventType === 'UPDATE') {
            const index = schedules.value.findIndex(
              s => s.id === payload.new.id
            )
            if (index !== -1) {
              schedules.value[index] = payload.new
            }
          }

          if (payload.eventType === 'DELETE') {
            schedules.value = schedules.value.filter(
              s => s.id !== payload.old.id
            )
          }
        }
      )
      .subscribe()
  }

  function unsubscribeRealtime() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  /* ================================
   * RESET
   * ================================ */
  function reset() {
    schedules.value = []
    activeTermId.value = null
    lastError.value = null
    unsubscribeRealtime()
  }

  /* ================================
   * PUBLIC API
   * ================================ */
  return {
    // state
    schedules,
    activeTermId,
    isLoading,
    lastError,

    // getters
    publishedSchedules,
    schedulesByClass,
    schedulesByFaculty,
    schedulesByRoom,

    // actions
    fetchSchedules,
    saveSchedule,
    archiveSchedule,
    deleteSchedule,
    undoSchedule,
    reset
  }
})
