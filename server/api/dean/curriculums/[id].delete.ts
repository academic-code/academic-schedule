import { defineEventHandler, createError } from "h3"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId, userId } = await requireDean(event)
  const id = event.context.params?.id

  const [{ count: subjectCount }, { count: classCount }] = await Promise.all([
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("curriculum_id", id),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("curriculum_id", id)
  ])

  if ((subjectCount ?? 0) > 0 || (classCount ?? 0) > 0) {
    throw createError({
      statusCode: 409,
      message: "Curriculum is already in use"
    })
  }

  await supabase.from("curriculums").delete().eq("id", id)

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "DELETE",
    entity_type: "CURRICULUM",
    entity_id: id
  })

  return { success: true }
})
