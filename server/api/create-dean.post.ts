import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, full_name, department_id } = body

  if (!email || !full_name || !department_id) {
    return { error: 'Missing required fields' }
  }

  // Server-side Supabase (service role)
  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  /* -----------------------------------------------------
      1. Check if an auth user already exists
  ----------------------------------------------------- */
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers()

  if (listErr) return { error: listErr.message }

  const exists = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (exists) return { error: "This email already exists." }

  /* -----------------------------------------------------
      2. Send invite
  ----------------------------------------------------- */
  const redirectUrl = `${process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/welcome`

  const { data: inviteData, error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        role: "DEAN",
        department_id
      },
      redirectTo: redirectUrl
    })

  if (inviteErr) {
    return { error: "Invite failed: " + inviteErr.message }
  }

  const auth_user_id = inviteData.user?.id

  /* -----------------------------------------------------
      3. Insert into users table
  ----------------------------------------------------- */
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

  if (userErr) return { error: "Failed to insert user: " + userErr.message }

  /* -----------------------------------------------------
      4. Insert into deans table
  ----------------------------------------------------- */
  const { error: deanErr } = await supabase
    .from("deans")
    .insert({
      user_id: userRow.id,
      department_id
    })

  if (deanErr) return { error: "Failed to insert dean: " + deanErr.message }

  return { success: true }
})
