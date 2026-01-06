// server/api/dean/subjects/[id].delete.ts
import { defineEventHandler, createError } from "h3"
import { requireDeanWithSupabase, assertAcademicTermUnlocked } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, userId, departmentId } =
    await requireDeanWithSupabase(event)

  const subjectId = event.context.params?.id
  if (!subjectId) {
    throw createError({ statusCode: 400, message: "Missing subject id" })
  }

  await assertAcademicTermUnlocked(supabase)

  const { count } = await supabase
    .from("schedules")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", subjectId)

  if ((count ?? 0) > 0) {
    throw createError({
      statusCode: 409,
      message: "Cannot delete subject used in schedules"
    })
  }

  const { data: existing } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .eq("department_id", departmentId)
    .single()

  if (!existing) {
    throw createError({ statusCode: 404, message: "Subject not found" })
  }

  await supabase.from("subjects").delete().eq("id", subjectId)

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "DELETE",
    entity_type: "SUBJECT",
    entity_id: subjectId,
    old_value: existing
  })

  return { success: true }
})
