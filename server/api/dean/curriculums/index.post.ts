import { defineEventHandler, readBody, createError } from "h3"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId, userId } = await requireDean(event)
  const { program, curriculum_code, effective_year } = await readBody(event)

  if (!program || !curriculum_code || !effective_year) {
    throw createError({ statusCode: 400, message: "All fields are required" })
  }

  const { data: exists } = await supabase
    .from("curriculums")
    .select("id")
    .eq("department_id", departmentId)
    .eq("program", program)
    .eq("curriculum_code", curriculum_code)
    .maybeSingle()

  if (exists) {
    throw createError({
      statusCode: 409,
      message: `Curriculum ${program} ${curriculum_code} already exists`
    })
  }

  const { data, error } = await supabase
    .from("curriculums")
    .insert({
      department_id: departmentId,
      program,
      curriculum_code,
      effective_year,
      is_active: true
    })
    .select()
    .single()

  if (error) throw error

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "CREATE",
    entity_type: "CURRICULUM",
    entity_id: data.id,
    new_value: data
  })

  return data
})
