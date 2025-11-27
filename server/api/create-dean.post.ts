import { defineEventHandler, readBody } from 'h3'
import { createServerClient } from '@supabase/ssr'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { email, full_name, department_id } = body

  if (!email || !full_name || !department_id) {
    return { error: "Missing required fields." }
  }

  // ✔ Create a server-side Supabase client (safe for Nitro)
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return '' },
        set() {},
        remove() {}
      }
    }
  )

  // 1️⃣ Create Auth User
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: false
    })

  if (authError) {
    console.error(authError)
    return { error: "Failed to create Auth user." }
  }

  const auth_id = authUser.user.id

  // 2️⃣ Insert into public.users
  const { data: newUser, error: userErr } = await supabase
    .from('users')
    .insert({
      auth_user_id: auth_id,
      email,
      full_name,
      role: 'DEAN'
    })
    .select()
    .single()

  if (userErr) {
    console.error(userErr)
    return { error: "Failed to insert user record." }
  }

  // 3️⃣ Insert into deans table
  const { error: deanErr } = await supabase
    .from('deans')
    .insert({
      user_id: newUser.id,
      department_id
    })

  if (deanErr) {
    console.error(deanErr)
    return { error: "Failed to create dean entry." }
  }

  return { success: true }
})
