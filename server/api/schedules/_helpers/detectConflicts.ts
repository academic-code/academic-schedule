import type { SupabaseClient } from "@supabase/supabase-js"
import type { SchedulePayload } from "./types"

interface ConflictRow {
  period_id: string
  schedule_id: string
  schedules: {
    id: string
    faculty_id: string
    room_id: string
    class_id: string
    academic_term_id: string
    status: "PUBLISHED"
    day: string
  }[]
}

export async function detectConflicts(
  supabase: SupabaseClient,
  payload: SchedulePayload
): Promise<ConflictRow[]> {
  const {
    academic_term_id,
    faculty_id,
    room_id,
    class_id,
    day,
    id,
    start_period_id,
    end_period_id
  } = payload

  // 1️⃣ Expand target period range
  const { data: allPeriods } = await supabase
    .from("periods")
    .select("id, slot_index")
    .order("slot_index")

  if (!allPeriods) return []

  const startSlot = allPeriods.find(p => p.id === start_period_id)?.slot_index
  const endSlot = allPeriods.find(p => p.id === end_period_id)?.slot_index

  if (startSlot === undefined || endSlot === undefined) return []

  const targetPeriodIds = allPeriods
    .filter(p => p.slot_index >= startSlot && p.slot_index <= endSlot)
    .map(p => p.id)

  // 2️⃣ Query overlapping schedule_periods
  const { data, error } = await supabase
    .from("schedule_periods")
    .select(`
      period_id,
      schedule_id,
      schedules!inner (
        id,
        faculty_id,
        room_id,
        class_id,
        academic_term_id,
        status,
        day,
        department_id
      )
    `)
    .in("period_id", targetPeriodIds)
    .eq("schedules.academic_term_id", academic_term_id)
    .eq("schedules.department_id", payload.department_id)
    .eq("schedules.status", "PUBLISHED")
    .eq("schedules.day", day)

  if (error) throw error

  const seen = new Set<string>()

  return (data ?? []).filter(row => {
    const s = row.schedules[0]
    if (!s) return false

    // Exclude self (update case)
    if (id && s.id === id) return false

    // Deduplicate per schedule
    if (seen.has(s.id)) return false
    seen.add(s.id)

    return (
      s.faculty_id === faculty_id ||
      s.room_id === room_id ||
      s.class_id === class_id
    )
  })
}
