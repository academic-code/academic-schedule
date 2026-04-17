import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type CreateAcademicTermBody = {
  academic_year?: string
  semester?: number
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

  const body = await readBody<CreateAcademicTermBody>(event)
  const academic_year = body.academic_year?.trim()
  const semester = body.semester

  if (!academic_year || !semester) {
    throw createError({
      statusCode: 400,
      message: 'Academic year and semester are required'
    })
  }

  if (![1, 2, 3].includes(semester)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid semester'
    })
  }

  const { data: exists, error: existsError } = await supabaseAdmin
    .from('academic_terms')
    .select('id')
    .eq('academic_year', academic_year)
    .eq('semester', semester)
    .maybeSingle()

  if (existsError) {
    throw createError({ statusCode: 500, message: existsError.message })
  }

  if (exists) {
    throw createError({
      statusCode: 409,
      message: 'Academic year and semester already exists'
    })
  }

  const { data: created, error: createErrorDb } = await supabaseAdmin
    .from('academic_terms')
    .insert({
      academic_year,
      semester,
      is_active: false,
      is_locked: false
    })
    .select('*')
    .single()

  if (createErrorDb || !created) {
    throw createError({
      statusCode: 500,
      message: createErrorDb?.message || 'Failed to create academic term'
    })
  }

  const { error: auditError } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: authUser.id,
      action: 'CREATE',
      entity_type: 'ACADEMIC_TERM',
      entity_id: created.id,
      old_value: null,
      new_value: {
        academic_year,
        semester,
        is_active: false,
        is_locked: false
      }
    })

  if (auditError) {
    throw createError({ statusCode: 500, message: auditError.message })
  }

  return { success: true, term: created }
})