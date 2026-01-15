import type { SupabaseClient } from "@supabase/supabase-js"

export type ScheduleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

export interface SchedulePayload {
  id?: string
  academic_term_id: string
  department_id: string
  class_id: string | null
  subject_id: string
  faculty_id: string
  room_id: string
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN"
  start_period_id: string
  end_period_id: string
  mode: "F2F" | "ONLINE" | "ASYNC"
  status: ScheduleStatus
  is_simulation?: boolean
}


export interface ScheduleContext {
  supabase: SupabaseClient
  payload: SchedulePayload
  oldSchedule?: any
}
