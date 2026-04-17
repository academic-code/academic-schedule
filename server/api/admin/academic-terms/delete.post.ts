import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type DeleteAcademicTermBody = {
  id?: string
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

  const body = await readBody<DeleteAcademicTermBody>(event)
  const id = body.id?.trim()

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Missing academic term id'
    })
  }

  const { data: term, error: termError } = await supabaseAdmin
    .from('academic_terms')
    .select('*')
    .eq('id', id)
    .single()

  if (termError || !term) {
    throw createError({
      statusCode: 404,
      message: 'Academic term not found'
    })
  }

  if (term.is_active) {
    throw createError({
      statusCode: 409,
      message: 'Cannot delete an active academic term'
    })
  }

  const { count, error: usageError } = await supabaseAdmin
    .from('schedules')
    .select('*', { count: 'exact', head: true })
    .eq('academic_term_id', id)

  if (usageError) {
    throw createError({
      statusCode: 500,
      message: usageError.message
    })
  }

  if ((count ?? 0) > 0) {
    throw createError({
      statusCode: 409,
      message: 'Cannot delete academic term because it is already used in schedules'
    })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('academic_terms')
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw createError({
      statusCode: 500,
      message: deleteError.message
    })
  }

  const { error: auditError } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: authUser.id,
      action: 'DELETE',
      entity_type: 'ACADEMIC_TERM',
      entity_id: id,
      old_value: term,
      new_value: null
    })

  if (auditError) {
    throw createError({
      statusCode: 500,
      message: auditError.message
    })
  }

  return { success: true }
})