// server/api/dean/subjects/[id].patch.ts
import { defineEventHandler, readBody, createError } from "h3"
import { requireDeanWithSupabase, assertAcademicTermUnlocked } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, userId, departmentId } =
    await requireDeanWithSupabase(event)

  const subjectId = event.context.params?.id
  if (!subjectId) {
    throw createError({ statusCode: 400, message: "Missing subject id" })
  }

  await assertAcademicTermUnlocked(supabase)

  const body = await readBody(event)

  const { data: existing } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .eq("department_id", departmentId)
    .single()

  if (!existing) {
    throw createError({ statusCode: 404, message: "Subject not found" })
  }

  const { data, error } = await supabase
    .from("subjects")
    .update(body)
    .eq("id", subjectId)
    .select()
    .single()

  if (error) throw error

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "UPDATE",
    entity_type: "SUBJECT",
    entity_id: subjectId,
    old_value: existing,
    new_value: data
  })

  return data
})
