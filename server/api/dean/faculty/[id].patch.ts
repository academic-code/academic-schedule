import { defineEventHandler, readBody, createError } from "h3"
import {
  requireDeanWithSupabase,
  assertAcademicTermUnlocked
} from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, userId, departmentId } =
    await requireDeanWithSupabase(event)

  await assertAcademicTermUnlocked(supabase)

  const facultyId = event.context.params?.id
  if (!facultyId) {
    throw createError({ statusCode: 400, message: "Missing faculty id" })
  }

  const body = await readBody(event)

  // 🚫 NEVER allow email update
  delete body.email

  const { data: existing } = await supabase
    .from("faculty")
    .select("*")
    .eq("id", facultyId)
    .eq("department_id", departmentId)
    .single()

  if (!existing) {
    throw createError({ statusCode: 404, message: "Faculty not found" })
  }

  // 🔐 BLOCK DEACTIVATION IF HAS SCHEDULES
  if (body.is_active === false) {
    const { count } = await supabase
      .from("schedules")
      .select("id", { count: "exact", head: true })
      .eq("faculty_id", facultyId)

    if ((count ?? 0) > 0) {
      throw createError({
        statusCode: 409,
        message: "Cannot deactivate faculty with assigned schedules"
      })
    }
  }

  const { data: updated, error } = await supabase
    .from("faculty")
    .update(body)
    .eq("id", facultyId)
    .select()
    .single()

  if (error) throw error

  if (typeof body.is_active === "boolean") {
    await supabase
      .from("users")
      .update({ is_active: body.is_active })
      .eq("id", existing.user_id)
  }

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "UPDATE",
    entity_type: "FACULTY",
    entity_id: facultyId,
    old_value: existing,
    new_value: updated
  })

  return updated
})
