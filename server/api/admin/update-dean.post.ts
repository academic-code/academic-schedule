import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type UpdateDeanBody = {
  user_id?: string
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

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUBLIC_URL || !PUBLIC_KEY) {
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

  const body = await readBody<UpdateDeanBody>(event)

  const user_id = body.user_id?.trim()
  const first_name = body.first_name?.trim()
  const last_name = body.last_name?.trim()
  const middle_name = body.middle_name?.trim() || null
  const department_id = body.department_id?.trim()

  if (!user_id || !first_name || !last_name || !department_id) {
    throw createError({
      statusCode: 400,
      message: 'user_id, first name, last name, and department are required'
    })
  }

  const { data: targetDean, error: targetDeanError } = await supabaseAdmin
    .from('deans')
    .select('id, user_id, department_id')
    .eq('user_id', user_id)
    .single()

  if (targetDeanError || !targetDean) {
    throw createError({
      statusCode: 404,
      message: 'Dean record not found'
    })
  }

  const { data: targetUser, error: targetUserError } = await supabaseAdmin
    .from('users')
    .select('id, role, first_name, last_name, middle_name, department_id')
    .eq('id', user_id)
    .single()

  if (targetUserError || !targetUser || targetUser.role !== 'DEAN') {
    throw createError({
      statusCode: 404,
      message: 'Dean user not found'
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

  if (targetDean.department_id !== department_id) {
    const { data: departmentDean, error: departmentDeanError } = await supabaseAdmin
      .from('deans')
      .select('id, user_id')
      .eq('department_id', department_id)
      .maybeSingle()

    if (departmentDeanError) {
      throw createError({
        statusCode: 500,
        message: departmentDeanError.message
      })
    }

    if (departmentDean && departmentDean.user_id !== user_id) {
      throw createError({
        statusCode: 409,
        message: 'Department already has a dean'
      })
    }
  }

  const { error: updateUserError } = await supabaseAdmin
    .from('users')
    .update({
      first_name,
      last_name,
      middle_name,
      department_id
    })
    .eq('id', user_id)

  if (updateUserError) {
    throw createError({
      statusCode: 500,
      message: updateUserError.message
    })
  }

  const { error: updateDeanError } = await supabaseAdmin
    .from('deans')
    .update({
      department_id
    })
    .eq('user_id', user_id)

  if (updateDeanError) {
    throw createError({
      statusCode: 500,
      message: updateDeanError.message
    })
  }

  const { error: auditError } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: authUser.id,
      action: 'UPDATE',
      entity_type: 'DEAN',
      entity_id: user_id,
      old_value: {
        first_name: targetUser.first_name,
        last_name: targetUser.last_name,
        middle_name: targetUser.middle_name,
        department_id: targetDean.department_id
      },
      new_value: {
        first_name,
        last_name,
        middle_name,
        department_id
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