// server/api/dean/subjects/index.post.ts
import { defineEventHandler, readBody, createError } from "h3"
import { requireDeanWithSupabase, assertAcademicTermUnlocked } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, userId, departmentId } =
    await requireDeanWithSupabase(event)

  await assertAcademicTermUnlocked(supabase)

  const body = await readBody(event)
  const {
    curriculum_id,
    course_code,
    description,
    subject_type,
    year_level,
    semester,
    lec_units,
    lab_units
  } = body

  if (
    !curriculum_id ||
    !course_code ||
    !description ||
    !subject_type ||
    !year_level ||
    !semester
  ) {
    throw createError({
      statusCode: 400,
      message: "Missing required fields"
    })
  }

  try {
    const { data, error } = await supabase
      .from("subjects")
      .insert({
        department_id: departmentId,
        curriculum_id,
        course_code: course_code.trim(),
        description,
        subject_type,
        year_level,
        semester,
        lec_units: lec_units ?? 0,
        lab_units: lab_units ?? 0
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "CREATE",
      entity_type: "SUBJECT",
      entity_id: data.id,
      new_value: data
    })

    return data
  } catch (err: any) {
    if (err.code === "23505") {
      throw createError({
        statusCode: 409,
        message: "Subject already exists in this curriculum"
      })
    }
    throw err
  }
})
