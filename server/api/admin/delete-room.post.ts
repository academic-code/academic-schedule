import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type DeleteRoomBody = {
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

  const body = await readBody<DeleteRoomBody>(event)
  const id = body.id?.trim()

  if (!id) {
    throw createError({ statusCode: 400, message: 'Room id is required' })
  }

  const { data: room, error: roomError } = await supabaseAdmin
    .from('rooms')
    .select('id, name, room_type, capacity, is_active')
    .eq('id', id)
    .single()

  if (roomError || !room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  const { count, error: usageError } = await supabaseAdmin
    .from('schedules')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', id)

  if (usageError) {
    throw createError({ statusCode: 500, message: usageError.message })
  }

  if ((count ?? 0) > 0) {
    throw createError({
      statusCode: 409,
      message: 'Cannot delete room. This room is already used in schedules.'
    })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('rooms')
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw createError({ statusCode: 500, message: deleteError.message })
  }

  const { error: auditError } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: authUser.id,
      action: 'DELETE',
      entity_type: 'ROOM',
      entity_id: id,
      old_value: room,
      new_value: null
    })

  if (auditError) {
    throw createError({ statusCode: 500, message: auditError.message })
  }

  return { success: true }
})