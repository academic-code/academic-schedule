import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type DeleteDeanBody = {
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

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUBLIC_URL || !PUBLIC_KEY) {
    throw createError({ statusCode: 500, message: 'Server configuration is incomplete' })
  }

  const serverUrl = SUPABASE_URL!
  const serviceRoleKey = SERVICE_ROLE_KEY!
  const publicUrl = PUBLIC_URL!
  const publicKey = PUBLIC_KEY!

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

  const body = await readBody<DeleteDeanBody>(event)
  const deanUserId = body.user_id?.trim()

  if (!deanUserId) {
    throw createError({ statusCode: 400, message: 'Dean user_id is required' })
  }

  const { data: deanUser, error: deanUserError } = await supabaseAdmin
    .from('users')
    .select('id, email, role, department_id, first_name, last_name, middle_name')
    .eq('id', deanUserId)
    .single()

  if (deanUserError || !deanUser || deanUser.role !== 'DEAN') {
    throw createError({ statusCode: 404, message: 'Dean user not found' })
  }

  const { data: deanRow, error: deanRowError } = await supabaseAdmin
    .from('deans')
    .select('id, user_id, department_id')
    .eq('user_id', deanUserId)
    .single()

  if (deanRowError || !deanRow) {
    throw createError({ statusCode: 404, message: 'Dean record not found' })
  }

  const { data: schedules, error: schedulesError } = await supabaseAdmin
    .from('schedules')
    .select('id')
    .eq('created_by', deanUserId)

  if (schedulesError) {
    throw createError({
      statusCode: 500,
      message: schedulesError.message
    })
  }

  const scheduleIds = (schedules ?? []).map((row) => row.id)

  if (scheduleIds.length > 0) {
    const { error: schedulePeriodsError } = await supabaseAdmin
      .from('schedule_periods')
      .delete()
      .in('schedule_id', scheduleIds)

    if (schedulePeriodsError) {
      throw createError({
        statusCode: 500,
        message: schedulePeriodsError.message
      })
    }

    const { error: scheduleDeleteError } = await supabaseAdmin
      .from('schedules')
      .delete()
      .in('id', scheduleIds)

    if (scheduleDeleteError) {
      throw createError({
        statusCode: 500,
        message: scheduleDeleteError.message
      })
    }
  }

  const { error: notificationDeleteError } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', deanUserId)

  if (notificationDeleteError) {
    throw createError({
      statusCode: 500,
      message: notificationDeleteError.message
    })
  }

  const { error: auditDeleteError } = await supabaseAdmin
    .from('audit_logs')
    .delete()
    .eq('user_id', deanUserId)

  if (auditDeleteError) {
    throw createError({
      statusCode: 500,
      message: auditDeleteError.message
    })
  }

  const { error: deanDeleteError } = await supabaseAdmin
    .from('deans')
    .delete()
    .eq('user_id', deanUserId)

  if (deanDeleteError) {
    throw createError({
      statusCode: 500,
      message: deanDeleteError.message
    })
  }

  const { error: userDeleteError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', deanUserId)

  if (userDeleteError) {
    throw createError({
      statusCode: 500,
      message: userDeleteError.message
    })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(deanUserId)

  if (authDeleteError) {
    throw createError({
      statusCode: 500,
      message: authDeleteError.message
    })
  }

  const { error: auditError } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: authUser.id,
      action: 'DELETE',
      entity_type: 'DEAN',
      entity_id: deanUserId,
      old_value: {
        email: deanUser.email,
        first_name: deanUser.first_name,
        last_name: deanUser.last_name,
        middle_name: deanUser.middle_name,
        department_id: deanRow.department_id,
        deleted_schedule_count: scheduleIds.length
      },
      new_value: null
    })

  if (auditError) {
    throw createError({
      statusCode: 500,
      message: auditError.message
    })
  }

  return {
    success: true,
    deleted_schedule_count: scheduleIds.length
  }
})