import type { SupabaseClient } from "@supabase/supabase-js"
import type { SchedulePayload } from "./types"

export async function emitNotifications(
  supabase: SupabaseClient,
  payload: SchedulePayload
) {
  if (payload.status !== "PUBLISHED" || payload.is_simulation) return

  const { data: faculty } = await supabase
    .from("faculty")
    .select("user_id")
    .eq("id", payload.faculty_id)
    .single()

  if (!faculty?.user_id) return

  await supabase.from("notifications").insert({
    user_id: faculty.user_id,
    type: "SCHEDULE",
    title: "Schedule Published",
    message: "A schedule has been assigned to you",
    entity_type: "SCHEDULE",
    entity_id: payload.id
  })
}
