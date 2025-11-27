import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { dean_id, user_id, full_name, department_id, original_department_id, original_email, email } = body

  if (!dean_id || !user_id) {
    return { error: "Missing required fields." }
  }

  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  /* -----------------------------------------------------
     1. Prevent duplicate deans per department
  ----------------------------------------------------- */
  if (department_id !== original_department_id) {
    const { data: exists } = await supabase
      .from("deans")
      .select("id")
      .eq("department_id", department_id)
      .limit(1)

    if (exists && exists.length > 0) {
      return { error: "This department already has a dean." }
    }
  }

  /* -----------------------------------------------------
     2. Update USERS table
  ----------------------------------------------------- */
  const updatePayload: any = { full_name }

  // Email edit allowed only if unchanged
  if (email === original_email) {
    updatePayload.email = email
  }

  const { error: userErr } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", user_id)

  if (userErr) return { error: "Failed to update user: " + userErr.message }

  /* -----------------------------------------------------
     3. Update DEANS table
  ----------------------------------------------------- */
  const { data: deanRow, error: deanErr } = await supabase
    .from("deans")
    .update({ department_id })
    .eq("id", dean_id)
    .select()
    .single()

  if (deanErr) return { error: "Failed to update dean: " + deanErr.message }

  return {
    success: true,
    message: "Dean updated successfully.",
    dean: deanRow
  }
})
