// app/utils/supabase/schedulesService.ts
import supabase from './supabaseClient'
import type { Schedule, SchedulePeriod, UUID } from './types'

/**
 * Filters accepted by fetchSchedules()
 */
export interface ScheduleFilters {
  departmentId?: UUID
  classId?: UUID
  facultyId?: UUID
  day?: string
  limit?: number
}

/**
 * Fetch schedules visible to the current user.
 * Automatically respects RLS.
 */
export async function fetchSchedules(filters: ScheduleFilters = {}): Promise<Schedule[]> {
  let q = supabase.from('schedules').select('*')

  if (filters.departmentId) q = q.eq('department_id', filters.departmentId)
  if (filters.classId) q = q.eq('class_id', filters.classId)
  if (filters.facultyId) q = q.eq('faculty_id', filters.facultyId)
  if (filters.day) q = q.eq('day', filters.day)
  if (filters.limit) q = q.limit(filters.limit)

  const { data, error } = await q
  if (error) throw error
  return data as Schedule[]
}

/**
 * Create a schedule + its schedule_periods.
 */
export async function createScheduleWithPeriods(
  schedule: Partial<Schedule>,
  periods: UUID[]
): Promise<{ schedule: Schedule; periods: SchedulePeriod[] }> {
  // Insert schedule
  const { data: s, error: sErr } = await supabase
    .from('schedules')
    .insert(schedule)
    .select()
    .single()

  if (sErr) throw sErr

  const scheduleId = s.id as UUID

  // Prepare child period rows
  const rows = periods.map((pid: UUID) => ({
    schedule_id: scheduleId,
    period_id: pid
  }))

  // Insert schedule_periods
  const { data: spData, error: spErr } = await supabase
    .from('schedule_periods')
    .insert(rows)
    .select()

  if (spErr) throw spErr

  return { schedule: s as Schedule, periods: spData as SchedulePeriod[] }
}

/**
 * Fetch periods belonging to a schedule
 */
export async function fetchSchedulePeriods(scheduleId: UUID): Promise<SchedulePeriod[]> {
  const { data, error } = await supabase
    .from('schedule_periods')
    .select('*')
    .eq('schedule_id', scheduleId)

  if (error) throw error
  return data as SchedulePeriod[]
}
