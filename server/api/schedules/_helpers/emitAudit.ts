import type { SupabaseClient } from "@supabase/supabase-js"

export type ScheduleAuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PUBLISH"
  | "ARCHIVE"
  | "SIMULATE"

export async function emitAudit(
  supabase: SupabaseClient,
  userId: string,
  action: ScheduleAuditAction,
  entityId: string,
  oldValue?: unknown,
  newValue?: unknown
) {
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action,
    entity_type: "SCHEDULE",
    entity_id: entityId,
    old_value: oldValue ?? null,
    new_value: newValue ?? null
  })
}
