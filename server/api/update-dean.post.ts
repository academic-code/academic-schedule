import { defineEventHandler, readBody } from 'h3'
import { createServerClient } from '@supabase/ssr'

export default defineEventHandler(async (event) => {

  const body = await readBody(event)
  const { dean_id, user_id, full_name, email, department_id, original_department_id } = body

  if (!dean_id || !user_id) {
    return { error: "Missing dean_id or user_id." }
  }

  // =======================
  // Supabase (SSR Server)
  // =======================
  const supabase = createServerClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => "",
        set: () => {},
        remove: () => {},
      },
    }
  )

  // =======================
  // Prevent duplicate deans per department
  // =======================
  if (department_id !== original_department_id) {
    const { data: exists, error: existsErr } = await supabase
      .from("deans")
      .select("id")
      .eq("department_id", department_id)
      .limit(1)

    if (existsErr) return { error: existsErr.message }

    if (exists && exists.length > 0) {
      return { error: "This department already has a dean." }
    }
  }

  // =======================
  // Update USERS table
  // =======================
  const userUpdatePayload: any = {
    full_name,
  }

  // NOTE:
  // Changing email for Supabase Auth users requires secure flow.
  // You can allow it **ONLY IF** email was not changed.
  // We simply disallow email changes here.
  if (email && body.original_email === email) {
    userUpdatePayload.email = email
  }

  const { error: userErr } = await supabase
    .from("users")
    .update(userUpdatePayload)
    .eq("id", user_id)

  if (userErr) {
    return { error: `Failed to update user: ${userErr.message}` }
  }

  // =======================
  // Update DEANS table
  // =======================
  const { data: deanRow, error: deanErr } = await supabase
    .from("deans")
    .update({
      department_id,
    })
    .eq("id", dean_id)
    .select()
    .single()

  if (deanErr) {
    return { error: `Failed to update dean: ${deanErr.message}` }
  }

  return {
    success: true,
    message: "Dean updated successfully.",
    dean: deanRow
  }
})
