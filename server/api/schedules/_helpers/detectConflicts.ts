import type { SupabaseClient } from '@supabase/supabase-js'
import type { SchedulePayload } from './types'

export async function detectConflicts(
  supabase: SupabaseClient,
  payload: SchedulePayload
) {
  const {
    academic_term_id,
    id,
    day,
    start_period_id,
    end_period_id,
    faculty_id,
    room_id,
    class_id,
    target_department_id
  } = payload

  // Expand period range
  const { data: allPeriods, error: pErr } = await supabase
    .from('periods')
    .select('id, slot_index')
    .order('slot_index')
  if (pErr) throw pErr
  if (!allPeriods) return []

  const startSlot = allPeriods.find(p => p.id === start_period_id)?.slot_index
  const endSlot = allPeriods.find(p => p.id === end_period_id)?.slot_index
  if (startSlot === undefined || endSlot === undefined) return []

  const targetPeriodIds = allPeriods
    .filter(p => p.slot_index >= startSlot && p.slot_index <= endSlot)
    .map(p => p.id)

  // Read overlapping schedule_periods + their schedules
  const { data, error } = await supabase
    .from('schedule_periods')
    .select(`
      period_id,
      schedule_id,
      schedules!inner (
        id,
        academic_term_id,
        day,
        status,
        faculty_id,
        room_id,
        class_id,
        target_department_id
      )
    `)
    .in('period_id', targetPeriodIds)
    .eq('schedules.academic_term_id', academic_term_id)
    .eq('schedules.day', day)
    .eq('schedules.status', 'PUBLISHED')

  if (error) throw error

  const seen = new Set<string>()

  return (data ?? []).filter((row: any) => {
    const s = row.schedules?.[0]
    if (!s) return false

    if (id && s.id === id) return false // self update
    if (seen.has(s.id)) return false
    seen.add(s.id)

    const facultyConflict = faculty_id && s.faculty_id === faculty_id
    const roomConflict = room_id && s.room_id === room_id

    // Class conflict must be same class_id + same target dept
    const classConflict =
      class_id &&
      s.class_id === class_id &&
      s.target_department_id === target_department_id

    return Boolean(facultyConflict || roomConflict || classConflict)
  })
}