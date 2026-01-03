import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const SUPABASE_URL = config.SUPABASE_URL as string
  const SERVICE_ROLE_KEY = config.SUPABASE_SERVICE_ROLE_KEY as string
  const PUBLIC_SUPABASE_URL = config.public.SUPABASE_URL as string
  const PUBLIC_ANON_KEY = config.public.SUPABASE_ANON_KEY as string
  const SITE_URL = config.public.SITE_URL as string

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUBLIC_SUPABASE_URL || !PUBLIC_ANON_KEY || !SITE_URL) {
    throw createError({ statusCode: 500, message: 'Server configuration is incomplete' })
  }

  // ================= ADMIN CLIENT =================
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // ================= AUTH =================
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) throw createError({ statusCode: 401, message: 'Missing auth header' })

  const supabaseUser = createClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_ANON_KEY,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: authData } = await supabaseUser.auth.getUser()
  const authUser = authData?.user
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { data: adminRow } = await supabaseUser
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!adminRow || adminRow.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ================= INPUT =================
  const body = await readBody(event)

  const email = body?.email as string
  const first_name = body?.first_name as string
  const last_name = body?.last_name as string
  const middle_name = body?.middle_name as string | null
  const department_id = body?.department_id as string

  if (!email || !first_name || !last_name || !department_id) {
    throw createError({
      statusCode: 400,
      message: 'Email, first name, last name, and department are required'
    })
  }

  // ================= DUPLICATE CHECK =================
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    throw createError({ statusCode: 409, message: 'Email already exists' })
  }

  const { data: existingDean } = await supabaseAdmin
    .from('deans')
    .select('id')
    .eq('department_id', department_id)
    .maybeSingle()

  if (existingDean) {
    throw createError({ statusCode: 409, message: 'Department already has a dean' })
  }

  // ================= INVITE USER (EMAIL SENT HERE) =================
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${SITE_URL}/auth/set-password`
    })

  if (inviteError || !inviteData.user) {
    throw createError({ statusCode: 400, message: inviteError?.message })
  }

  const deanUserId = inviteData.user.id

  try {
    // ================= INSERT USERS =================
    await supabaseAdmin.from('users').insert({
      id: deanUserId,
      email,
      role: 'DEAN',
      department_id,
      first_name,
      last_name,
      middle_name,
      is_active: true
    })

    // ================= INSERT DEANS =================
    await supabaseAdmin.from('deans').insert({
      user_id: deanUserId,
      department_id
    })

    // ================= NOTIFICATION =================
    await supabaseAdmin.from('notifications').insert({
      user_id: deanUserId,
      type: 'SYSTEM',
      title: 'Dean Invitation',
      message: 'You have been invited as a Dean. Please check your email to activate your account.',
      entity_type: 'DEAN',
      entity_id: deanUserId
    })

    // ================= AUDIT LOG =================
    await supabaseAdmin.from('audit_logs').insert({
      user_id: authUser.id,
      action: 'CREATE',
      entity_type: 'DEAN',
      entity_id: deanUserId,
      old_value: null,
      new_value: { email, first_name, last_name, middle_name, department_id }
    })

    return { success: true }
  } catch {
    await supabaseAdmin.auth.admin.deleteUser(deanUserId)
    throw createError({ statusCode: 500, message: 'Dean creation failed. Rolled back.' })
  }
})
