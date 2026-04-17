import { createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type CountResult = {
  count: number | null
  error: Error | null
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
    throw createError({
      statusCode: 500,
      message: 'Server configuration is incomplete'
    })
  }

  const serverUrl = SUPABASE_URL!
  const serviceRoleKey = SERVICE_ROLE_KEY!
  const publicUrl = PUBLIC_URL!
  const publicKey = PUBLIC_KEY!

  const supabaseAdmin = createClient(serverUrl, serviceRoleKey)

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) {
    throw createError({
      statusCode: 401,
      message: 'Missing auth header'
    })
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
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const { data: adminRow, error: adminError } = await supabaseUser
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (adminError || !adminRow || adminRow.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required'
    })
  }

  const [
    departmentsRes,
    deansRes,
    facultyRes,
    schedulesRes,
    activeTermRes,
    activityRes
  ] = await Promise.all([
    supabaseAdmin.from('departments').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('deans').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('faculty').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('schedules').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('academic_terms')
      .select('id, academic_year, semester, is_active, is_locked, created_at')
      .eq('is_active', true)
      .maybeSingle(),
    supabaseAdmin
      .from('audit_logs')
      .select('id, action, entity_type, created_at')
      .order('created_at', { ascending: false })
      .limit(8)
  ])

  const countResponses: CountResult[] = [
    { count: departmentsRes.count, error: departmentsRes.error as Error | null },
    { count: deansRes.count, error: deansRes.error as Error | null },
    { count: facultyRes.count, error: facultyRes.error as Error | null },
    { count: schedulesRes.count, error: schedulesRes.error as Error | null }
  ]

  const countError = countResponses.find((item) => item.error)
  if (countError?.error) {
    throw createError({
      statusCode: 500,
      message: countError.error.message
    })
  }

  if (activeTermRes.error) {
    throw createError({
      statusCode: 500,
      message: activeTermRes.error.message
    })
  }

  if (activityRes.error) {
    throw createError({
      statusCode: 500,
      message: activityRes.error.message
    })
  }

  return {
    stats: {
      departments: departmentsRes.count ?? 0,
      deans: deansRes.count ?? 0,
      faculty: facultyRes.count ?? 0,
      schedules: schedulesRes.count ?? 0
    },
    activeTerm: activeTermRes.data ?? null,
    recentActivity: activityRes.data ?? []
  }
})