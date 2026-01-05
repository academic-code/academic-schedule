import { defineEventHandler, readBody, createError } from "h3"
import { requireDeanWithSupabase, assertTermUnlocked } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId, userId } = await requireDeanWithSupabase(event)
  await assertTermUnlocked(supabase)

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: "Missing id" })

  const body = await readBody(event)

  const { data: existing } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .eq("department_id", departmentId)
    .single()

  if (!existing) throw createError({ statusCode: 404, message: "Not found" })

  const { data } = await supabase
    .from("classes")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "UPDATE",
    entity_type: "CLASS",
    entity_id: id,
    old_value: existing,
    new_value: data
  })

  return data
})
