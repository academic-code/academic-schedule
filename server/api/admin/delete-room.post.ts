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

  if (adminRow?.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ================= INPUT =================
  const { id } = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Room id is required' })
  }

  // ================= PREVENT DELETE IF USED =================
  const { count } = await supabaseAdmin
    .from('schedules')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', id)

  if ((count ?? 0) > 0) {
    throw createError({
      statusCode: 409,
      message: 'Cannot delete room. This room is already used in schedules.'
    })
  }

  // ================= DELETE ROOM =================
  const { error } = await supabaseAdmin
    .from('rooms')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // ================= AUDIT =================
  await supabaseAdmin.from('audit_logs').insert({
    user_id: adminUser.id,
    action: 'DELETE',
    entity_type: 'ROOM',
    entity_id: id
  })

  return { success: true }
})
