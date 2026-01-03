import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const { id, is_active } = await readBody(event)

  if (!id || typeof is_active !== 'boolean') {
    throw createError({ statusCode: 400, message: 'Invalid payload' })
  }

  await supabase.from('rooms')
    .update({ is_active })
    .eq('id', id)

  return { success: true }
})
