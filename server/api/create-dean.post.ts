import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, full_name, department_id } = body

  if (!email || !full_name || !department_id) {
    return { error: 'Missing required fields' }
  }

  // Supabase Admin Client (service role)
  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  /* -----------------------------------------------------
      1. Check if email already exists
  ----------------------------------------------------- */
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) return { error: listErr.message }

  if (userList.users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
    return { error: "Email already exists." }
  }

  /* -----------------------------------------------------
      2. Create redirect link to welcome page
  ----------------------------------------------------- */
  const redirectUrl = `${process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/welcome`

  /* -----------------------------------------------------
      3. Send Supabase Invite Email
  ----------------------------------------------------- */
  const { data: inviteData, error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectUrl,
      data: {
        role: "DEAN",
        department_id
      }
    })

  if (inviteErr) return { error: `Invite failed: ${inviteErr.message}` }

  const auth_user_id = inviteData?.user?.id

  /* -----------------------------------------------------
      4. Insert into users table
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

  if (userErr) return { error: userErr.message }

  /* -----------------------------------------------------
      5. Insert dean row
  ----------------------------------------------------- */
  const { error: deanErr } = await supabase
    .from("deans")
    .insert({
      user_id: userRow.id,
      department_id
    })

  if (deanErr) return { error: deanErr.message }

  return {
    success: true,
    message: "Dean created and invite sent."
  }
})
