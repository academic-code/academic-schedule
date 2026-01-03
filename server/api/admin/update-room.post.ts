import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const { id, name, room_type, capacity } = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing room id' })
  }

  await supabase.from('rooms').update({
    name,
    room_type,
    capacity
  }).eq('id', id)

  return { success: true }
})
