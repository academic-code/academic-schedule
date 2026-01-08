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
  const {
    curriculum_id,
    course_code,
    year_level,
    semester
  } = body

  /* ---------- LOAD EXISTING SUBJECT ---------- */

  const { data: existing } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .eq("department_id", departmentId)
    .single()

  if (!existing) {
    throw createError({ statusCode: 404, message: "Subject not found" })
  }

  /* ---------- UPDATE ---------- */

  try {
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
  } catch (err: any) {
    /* ---------- DUPLICATE HANDLER ---------- */

    if (err?.code === "23505") {
      // Find the conflicting subject
      const { data: duplicate } = await supabase
        .from("subjects")
        .select(`
          course_code,
          description,
          year_level,
          semester
        `)
        .eq("curriculum_id", curriculum_id ?? existing.curriculum_id)
        .eq("course_code", course_code)
        .eq("year_level", year_level)
        .eq("semester", semester)
        .neq("id", subjectId)
        .maybeSingle()

      const detail = duplicate
        ? `Duplicate entry detected:
${duplicate.course_code} – ${duplicate.description}
Year ${duplicate.year_level}, Semester ${duplicate.semester}`
        : "Duplicate subject detected in the same curriculum."

      throw createError({
        statusCode: 409,
        message: detail
      })
    }

    throw err
  }
})
