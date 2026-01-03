import { readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const {
    user_id,
    first_name,
    last_name,
    middle_name,
    department_id
  } = await readBody(event)

  if (!user_id) {
    throw createError({ statusCode: 400, message: 'Missing user_id' })
  }

  await supabase.from('users').update({
    first_name,
    last_name,
    middle_name,
    department_id
  }).eq('id', user_id)

  await supabase.from('deans').update({
    department_id
  }).eq('user_id', user_id)

  await supabase.from('audit_logs').insert({
    action: 'UPDATE',
    entity_type: 'DEAN',
    entity_id: user_id
  })

  return { success: true }
})
