import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // ================= CLIENTS =================
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
    {
      global: {
        headers: { Authorization: authHeader }
      }
    }
  )

  const { data: authData } = await supabaseUser.auth.getUser()
  const authUser = authData?.user

  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data: userRow } = await supabaseUser
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (!userRow || userRow.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ================= INPUT =================
  const { start_time, end_time, interval } = await readBody(event)

  if (!start_time || !end_time || !interval) {
    throw createError({
      statusCode: 400,
      message: 'start_time, end_time, and interval are required'
    })
  }

  // ================= SAFETY CHECK =================
  const { count } = await supabaseAdmin
    .from('schedules')
    .select('id', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    throw createError({
      statusCode: 400,
      message: 'Cannot regenerate periods once schedules exist'
    })
  }

  // ================= CLEAR OLD PERIODS =================
  await supabaseAdmin.from('periods').delete().neq('id', '')

  // ================= GENERATE =================
  const start = new Date(`1970-01-01T${start_time}:00`)
  const end = new Date(`1970-01-01T${end_time}:00`)

  let slotIndex = 1
  const rows: any[] = []

  while (start < end) {
    const next = new Date(start.getTime() + interval * 60000)
    if (next > end) break

    rows.push({
      start_time: start.toTimeString().slice(0, 8),
      end_time: next.toTimeString().slice(0, 8),
      slot_index: slotIndex++
    })

    start.setTime(next.getTime())
  }

  if (!rows.length) {
    throw createError({
      statusCode: 400,
      message: 'No periods generated with given parameters'
    })
  }

  await supabaseAdmin.from('periods').insert(rows)

  // ================= AUDIT LOG =================
  await supabaseAdmin.from('audit_logs').insert({
    user_id: authUser.id,
    action: 'CREATE',
    entity_type: 'PERIOD',
    new_value: {
      start_time,
      end_time,
      interval,
      total_slots: rows.length
    }
  })

  return {
    success: true,
    total: rows.length
  }
})
