import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type ResendDeanInviteBody = {
  user_id?: string
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

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUBLIC_URL || !PUBLIC_KEY || !SITE_URL) {
    throw createError({ statusCode: 500, message: 'Server configuration is incomplete' })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) {
    throw createError({ statusCode: 401, message: 'Missing auth header' })
  }

  const supabaseUser = createClient(PUBLIC_URL, PUBLIC_KEY, {
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

  const body = await readBody<ResendDeanInviteBody>(event)
  const user_id = body.user_id?.trim()

  if (!user_id) {
    throw createError({ statusCode: 400, message: 'user_id is required' })
  }

  const { data: deanUser, error: deanUserError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, is_active, last_login_at')
    .eq('id', user_id)
    .single()

  if (deanUserError || !deanUser || deanUser.role !== 'DEAN') {
    throw createError({ statusCode: 404, message: 'Dean user not found' })
  }

  if (!deanUser.is_active) {
    throw createError({
      statusCode: 409,
      message: 'Dean account is inactive. Reactivate it before resending the invite.'
    })
  }

  if (deanUser.last_login_at) {
    throw createError({
      statusCode: 409,
      message: 'This dean has already activated the account.'
    })
  }

  const { data: deanRow, error: deanRowError } = await supabaseAdmin
    .from('deans')
    .select('id')
    .eq('user_id', user_id)
    .single()

  if (deanRowError || !deanRow) {
    throw createError({ statusCode: 404, message: 'Dean record not found' })
  }

  const redirectTo = `${SITE_URL.replace(/\/+$/, '')}/auth/set-password`

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    deanUser.email,
    { redirectTo }
  )

  if (inviteError) {
    throw createError({
      statusCode: 500,
      message: inviteError.message
    })
  }

  const { error: auditError } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: authUser.id,
      action: 'UPDATE',
      entity_type: 'DEAN',
      entity_id: user_id,
      old_value: null,
      new_value: {
        resent_invite: true
      }
    })

  if (auditError) {
    throw createError({
      statusCode: 500,
      message: auditError.message
    })
  }

  return { success: true }
})