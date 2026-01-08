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

  // 🔒 EMAIL IS IMMUTABLE
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

  // ✅ UPDATE FACULTY
  const { error: updateErr } = await supabase
    .from("faculty")
    .update(body)
    .eq("id", facultyId)

  if (updateErr) throw updateErr

  // 🔄 SYNC USER ACTIVE FLAG
  if (typeof body.is_active === "boolean") {
    await supabase
      .from("users")
      .update({ is_active: body.is_active })
      .eq("id", existing.user_id)
  }

  // ✅ RE-FETCH WITH EMAIL JOIN
  const { data: updated, error } = await supabase
    .from("faculty")
    .select(`
      id,
      first_name,
      last_name,
      middle_name,
      faculty_type,
      is_active,
      created_at,
      users:users!faculty_user_id_fkey (
        email
      )
    `)
    .eq("id", facultyId)
    .single()

  if (error || !updated) {
    throw createError({ statusCode: 500, message: "Failed to reload faculty" })
  }

  // ✅ NORMALIZE EMAIL (TS SAFE)
  const email = Array.isArray(updated.users)
    ? updated.users[0]?.email ?? ""
    : ""

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "UPDATE",
    entity_type: "FACULTY",
    entity_id: facultyId,
    old_value: existing,
    new_value: updated
  })

  return {
    id: updated.id,
    first_name: updated.first_name,
    last_name: updated.last_name,
    middle_name: updated.middle_name,
    faculty_type: updated.faculty_type,
    is_active: updated.is_active,
    email,
    created_at: updated.created_at
  }
})
