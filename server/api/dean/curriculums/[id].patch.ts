import { defineEventHandler, readBody, createError } from "h3"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId, userId } = await requireDean(event)
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: "Missing id" })

  const body = await readBody(event)

  const { data: existing } = await supabase
    .from("curriculums")
    .select("*")
    .eq("id", id)
    .eq("department_id", departmentId)
    .single()

  if (!existing) {
    throw createError({ statusCode: 404, message: "Curriculum not found" })
  }

  const { data, error } = await supabase
    .from("curriculums")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "UPDATE",
    entity_type: "CURRICULUM",
    entity_id: id,
    old_value: existing,
    new_value: data
  })

  return data
})
