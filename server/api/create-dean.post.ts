import { defineEventHandler, readBody } from 'h3'
import { createServerClient } from '@supabase/ssr'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, full_name, department_id } = body

  if (!email || !full_name || !department_id) {
    return { error: 'Missing required fields' }
  }

  // Create server-side Supabase client
  const supabase = createServerClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => "",
        set: () => {},
        remove: () => {}
      }
    }
  )

  // ==========================================
  // 1) Check if email already exists
  // ==========================================
  const { data: list, error: listError } =
    await supabase.auth.admin.listUsers()

  if (listError) {
    return { error: listError.message }
  }

  const exists = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (exists) {
    return { error: "This email already exists in the system." }
  }

  // ==========================================
  // 2) Invite user (Sends email automatically)
  // ==========================================
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        role: "DEAN",
        department_id
      },
      redirectTo: `${process.env.NUXT_PUBLIC_SITE_URL}/welcome`
    })

  if (inviteError) {
    return { error: `Invite failed: ${inviteError.message}` }
  }

  const auth_user_id = inviteData?.user?.id ?? null

  // ==========================================
  // 3) Insert into users table
  // ==========================================
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .insert({
      email,
      full_name,
      role: "DEAN",
      auth_user_id
    })
    .select()
    .single()

  if (userErr) {
    return { error: `Failed to insert user: ${userErr.message}` }
  }

  // ==========================================
  // 4) Insert into deans table
  // ==========================================
  const { data: deanRow, error: deanErr } = await supabase
    .from("deans")
    .insert({
      user_id: userRow.id,
      department_id
    })
    .select()
    .single()

  if (deanErr) {
    return { error: `Failed to insert dean: ${deanErr.message}` }
  }

  return {
    success: true,
    message: "Dean created successfully. Email invitation sent.",
    dean: deanRow,
    user: userRow
  }
})
