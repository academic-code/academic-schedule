import { createError } from "h3"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function expandPeriods(
  supabase: SupabaseClient,
  scheduleId: string,
  startId: string,
  endId: string
) {
  const { data: periods } = await supabase
    .from("periods")
    .select("id, slot_index")
    .order("slot_index")

  if (!periods) return []

  const start = periods.find(p => p.id === startId)?.slot_index
  const end = periods.find(p => p.id === endId)?.slot_index

  if (start === undefined || end === undefined || start > end) {
    throw createError({ statusCode: 400, message: "Invalid period range" })
  }

  return periods
    .filter(p => p.slot_index >= start && p.slot_index <= end)
    .map(p => ({ schedule_id: scheduleId, period_id: p.id }))
}
