import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabaseAdmin = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) throw createError({ statusCode: 401, message: 'Missing auth header' })

  const body = await readBody(event)
  const { name, room_type, capacity } = body

  if (!name || !room_type) {
    throw createError({ statusCode: 400, message: 'Room name and type are required' })
  }

  const { error } = await supabaseAdmin.from('rooms').insert({
    name,
    room_type,
    capacity,
    is_active: true
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
