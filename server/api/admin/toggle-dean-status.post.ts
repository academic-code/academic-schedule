import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const supabaseAdmin = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  // ================= AUTH =================
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) {
    throw createError({ statusCode: 401, message: 'Missing auth header' })
  }

  const supabaseUser = createClient(
    config.public.SUPABASE_URL,
    config.public.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: authData } = await supabaseUser.auth.getUser()
  const adminUser = authData?.user
  if (!adminUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data: adminRow } = await supabaseUser
    .from('users')
    .select('role')
    .eq('id', adminUser.id)
    .single()

  if (!adminRow || adminRow.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ================= INPUT =================
  const body = await readBody(event)
  const { user_id, is_active } = body

  if (!user_id || typeof is_active !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'Invalid payload'
    })
  }

  // ================= UPDATE =================
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_active })
    .eq('id', user_id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // ================= AUDIT =================
  await supabaseAdmin.from('audit_logs').insert({
    user_id: adminUser.id,
    action: 'UPDATE',
    entity_type: 'DEAN',
    entity_id: user_id,
    old_value: null,
    new_value: { is_active }
  })

  return { success: true }
})
