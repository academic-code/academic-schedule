import { defineEventHandler, readBody, createError } from "h3"
import { requireDeanWithSupabase, assertTermUnlocked } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId, userId } =
    await requireDeanWithSupabase(event)

  await assertTermUnlocked(supabase)

  const body = await readBody(event)
  const { program, year_level, section, adviser_id, remarks } = body

  if (!program || !year_level || !section) {
    throw createError({
      statusCode: 400,
      message: "Program, year level, and section are required"
    })
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      department_id: departmentId,
      program,
      year_level,
      section,
      adviser_id: adviser_id || null,
      remarks: remarks || null
    })
    .select()
    .single()

  // 🔴 DUPLICATE HANDLING
  if (error) {
    if (error.code === "23505") {
      throw createError({
        statusCode: 409,
        message: "This class already exists for your department."
      })
    }

    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  // ✅ AUDIT LOG (ONLY ON SUCCESS)
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "CREATE",
    entity_type: "CLASS",
    entity_id: data.id,
    new_value: data
  })

  return data
})
