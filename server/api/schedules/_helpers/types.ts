import type { SupabaseClient } from '@supabase/supabase-js'

export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type WeekDay = 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN'
export type ScheduleMode = 'F2F'|'ONLINE'|'ASYNC'

export interface SchedulePayload {
  id?: string
  academic_term_id: string

  // ✅ NEW
  owner_department_id: string
  target_department_id: string

  // legacy (keep, but must equal target_department_id via CHECK)
  department_id?: string

  class_id: string | null
  subject_id: string
  faculty_id: string | null
  room_id: string | null

  day: WeekDay
  start_period_id: string
  end_period_id: string
  mode: ScheduleMode
  status: ScheduleStatus
  is_simulation?: boolean
}

export interface ScheduleAuthContext {
  supabase: SupabaseClient
  userId: string
  role: 'ADMIN' | 'DEAN'
  departmentId: string
  departmentType: 'REGULAR' | 'GENED' | 'PE_NSTP'
}