import { defineEventHandler, readBody, createError } from "h3"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId, userId } = await requireDean(event)
  const id = event.context.params?.id
  const body = await readBody(event)

  const { data: curriculum } = await supabase
    .from("curriculums")
    .select(`
      *,
      subjects:subjects(
        schedules(count)
      )
    `)
    .eq("id", id)
    .eq("department_id", departmentId)
    .single()

  if (!curriculum) {
    throw createError({ statusCode: 404, message: "Curriculum not found" })
  }

  const isLocked =
    (curriculum.subjects?.[0]?.schedules?.[0]?.count ?? 0) > 0

  if (isLocked && ("program" in body || "curriculum_code" in body)) {
    throw createError({
      statusCode: 403,
      message: "Curriculum is locked (used in schedules)"
    })
  }

  const { data, error } = await supabase
    .from("curriculums")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "UPDATE",
    entity_type: "CURRICULUM",
    entity_id: id,
    old_value: curriculum,
    new_value: data
  })

  return data
})
