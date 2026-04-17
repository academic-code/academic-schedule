import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type CreateRoomBody = {
  name?: string
  room_type?: 'LECTURE' | 'LAB' | 'ONLINE'
  capacity?: number | null
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

  const body = await readBody<CreateRoomBody>(event)

  const name = body.name?.trim()
  const room_type = body.room_type
  const capacity = body.capacity ?? null

  if (!name || !room_type) {
    throw createError({ statusCode: 400, message: 'Room name and type are required' })
  }

  const allowedTypes = ['LECTURE', 'LAB', 'ONLINE']
  if (!allowedTypes.includes(room_type)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid room type'
    })
  }

  const { data: duplicateRoom, error: duplicateError } = await supabaseAdmin
    .from('rooms')
    .select('id')
    .ilike('name', name)
    .maybeSingle()

  if (duplicateError) {
    throw createError({ statusCode: 500, message: duplicateError.message })
  }

  if (duplicateRoom) {
    throw createError({ statusCode: 409, message: 'Room name already exists' })
  }

  const { data: room, error: insertError } = await supabaseAdmin
    .from('rooms')
    .insert({
      name,
      room_type,
      capacity,
      is_active: true
    })
    .select('id, name, room_type, capacity, is_active')
    .single()

  if (insertError || !room) {
    throw createError({ statusCode: 500, message: insertError?.message || 'Failed to create room' })
  }

  const { error: auditError } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: authUser.id,
      action: 'CREATE',
      entity_type: 'ROOM',
      entity_id: room.id,
      old_value: null,
      new_value: room
    })

  if (auditError) {
    throw createError({ statusCode: 500, message: auditError.message })
  }

  return { success: true, room }
})