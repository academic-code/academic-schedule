import { defineEventHandler, createError } from "h3"
import { requireDeanWithSupabase, assertTermUnlocked } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId, userId } = await requireDeanWithSupabase(event)
  await assertTermUnlocked(supabase)

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: "Missing id" })

  const { count } = await supabase
    .from("schedules")
    .select("id", { count: "exact", head: true })
    .eq("class_id", id)

  if ((count ?? 0) > 0) {
    throw createError({ statusCode: 409, message: "Class has schedules" })
  }

  const { data: old } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .eq("department_id", departmentId)
    .single()

  await supabase.from("classes").delete().eq("id", id)

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "DELETE",
    entity_type: "CLASS",
    entity_id: id,
    old_value: old
  })

  return { success: true }
})
