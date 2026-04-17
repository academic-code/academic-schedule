import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type ActivateAcademicTermBody = {
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

  const body = await readBody<ActivateAcademicTermBody>(event)
  const id = body.id?.trim()

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Missing academic term id'
    })
  }

  const { data: targetTerm, error: targetError } = await supabaseAdmin
    .from('academic_terms')
    .select('*')
    .eq('id', id)
    .single()

  if (targetError || !targetTerm) {
    throw createError({
      statusCode: 404,
      message: 'Academic term not found'
    })
  }

  const { error: deactivateError } = await supabaseAdmin
    .from('academic_terms')
    .update({ is_active: false })
    .neq('id', id)

  if (deactivateError) {
    throw createError({
      statusCode: 500,
      message: deactivateError.message
    })
  }

  const { data: updatedTerm, error: activateErrorDb } = await supabaseAdmin
    .from('academic_terms')
    .update({
      is_active: true,
      is_locked: false
    })
    .eq('id', id)
    .select('*')
    .single()

  if (activateErrorDb || !updatedTerm) {
    throw createError({
      statusCode: 500,
      message: activateErrorDb?.message || 'Failed to activate academic term'
    })
  }

  const { error: auditError } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: authUser.id,
      action: 'UPDATE',
      entity_type: 'ACADEMIC_TERM',
      entity_id: id,
      old_value: {
        is_active: targetTerm.is_active,
        is_locked: targetTerm.is_locked
      },
      new_value: {
        is_active: true,
        is_locked: false
      }
    })

  if (auditError) {
    throw createError({
      statusCode: 500,
      message: auditError.message
    })
  }

  return { success: true, term: updatedTerm }
})