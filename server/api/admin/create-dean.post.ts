import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type CreateDeanBody = {
  email?: string
  first_name?: string
  last_name?: string
  middle_name?: string | null
  department_id?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const SUPABASE_URL =
    (config.SUPABASE_URL as string | undefined) ||
    (config.public.SUPABASE_URL as string | undefined)

  const SERVICE_ROLE_KEY = config.SUPABASE_SERVICE_ROLE_KEY as string | undefined
  const PUBLIC_URL = config.public.SUPABASE_URL as string | undefined
  const PUBLIC_KEY = config.public.SUPABASE_ANON_KEY as string | undefined
  const SITE_URL =
    (config.public.SITE_URL as string | undefined) ||
    (config.SITE_URL as string | undefined)

  const missing: string[] = []

  if (!SUPABASE_URL) missing.push('SUPABASE_URL or NUXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!PUBLIC_URL) missing.push('NUXT_PUBLIC_SUPABASE_URL')
  if (!PUBLIC_KEY) missing.push('NUXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!SITE_URL) missing.push('NUXT_PUBLIC_SITE_URL or SITE_URL')

  if (missing.length) {
    throw createError({
      statusCode: 500,
      message: `Server configuration is incomplete: ${missing.join(', ')}`
    })
  }

  // ✅ narrow to plain string for TypeScript
  const serverUrl = SUPABASE_URL!
  const serviceRoleKey = SERVICE_ROLE_KEY!
  const publicUrl = PUBLIC_URL!
  const publicKey = PUBLIC_KEY!
  const siteUrl = SITE_URL!

  const supabaseAdmin = createClient(serverUrl, serviceRoleKey)

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) {
    throw createError({ statusCode: 401, message: 'Missing auth header' })
  }

  const supabaseUser = createClient(publicUrl, publicKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  })

  const {
    data: { user: authUser },
    error: authError
  } = await supabaseUser.auth.getUser()

  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data: adminRow, error: adminError } = await supabaseUser
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (adminError || !adminRow || adminRow.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody<CreateDeanBody>(event)

  const email = body.email?.trim().toLowerCase()
  const first_name = body.first_name?.trim()
  const last_name = body.last_name?.trim()
  const middle_name = body.middle_name?.trim() || null
  const department_id = body.department_id?.trim()

  if (!email || !first_name || !last_name || !department_id) {
    throw createError({
      statusCode: 400,
      message: 'Email, first name, last name, and department are required'
    })
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!emailValid) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email address'
    })
  }

  const { data: departmentRow, error: departmentError } = await supabaseAdmin
    .from('departments')
    .select('id, name')
    .eq('id', department_id)
    .single()

  if (departmentError || !departmentRow) {
    throw createError({
      statusCode: 404,
      message: 'Department not found'
    })
  }

  const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUserError) {
    throw createError({
      statusCode: 500,
      message: existingUserError.message
    })
  }

  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'Email already exists'
    })
  }

  const { data: existingDean, error: existingDeanError } = await supabaseAdmin
    .from('deans')
    .select('id')
    .eq('department_id', department_id)
    .maybeSingle()

  if (existingDeanError) {
    throw createError({
      statusCode: 500,
      message: existingDeanError.message
    })
  }

  if (existingDean) {
    throw createError({
      statusCode: 409,
      message: 'Department already has a dean'
    })
  }

  const redirectTo = `${siteUrl.replace(/\/+$/, '')}/auth/set-password`

  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo
    })

  if (inviteError || !inviteData.user) {
    throw createError({
      statusCode: 400,
      message: inviteError?.message || 'Failed to invite dean'
    })
  }

  const deanUserId = inviteData.user.id

  try {
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: deanUserId,
        email,
        role: 'DEAN',
        department_id,
        first_name,
        last_name,
        middle_name,
        is_active: true
      })

    if (userInsertError) throw userInsertError

    const { error: deanInsertError } = await supabaseAdmin
      .from('deans')
      .insert({
        user_id: deanUserId,
        department_id
      })

    if (deanInsertError) throw deanInsertError

    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: deanUserId,
        type: 'SYSTEM',
        title: 'Dean Invitation',
        message: 'You have been invited as a Dean. Please check your email to activate your account.',
        entity_type: 'DEAN',
        entity_id: deanUserId
      })

    if (notificationError) throw notificationError

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authUser.id,
        action: 'CREATE',
        entity_type: 'DEAN',
        entity_id: deanUserId,
        old_value: null,
        new_value: {
          email,
          first_name,
          last_name,
          middle_name,
          department_id
        }
      })

    if (auditError) throw auditError

    return {
      success: true,
      user_id: deanUserId
    }
  } catch (err: any) {
    await supabaseAdmin.from('notifications').delete().eq('user_id', deanUserId)
    await supabaseAdmin.from('deans').delete().eq('user_id', deanUserId)
    await supabaseAdmin.from('users').delete().eq('id', deanUserId)
    await supabaseAdmin.auth.admin.deleteUser(deanUserId)

    throw createError({
      statusCode: 500,
      message: err?.message || 'Dean creation failed. Rolled back.'
    })
  }
})