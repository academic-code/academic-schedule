import { readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { id } = await readBody(event)
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing academic term id' })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  // ================= DEACTIVATE ALL =================
  await supabase
    .from('academic_terms')
    .update({ is_active: false })
    .neq('id', id)

  // ================= ACTIVATE TARGET =================
  const { error } = await supabase
    .from('academic_terms')
    .update({
      is_active: true,
      is_locked: false // always unlock on activation
    })
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // ================= AUDIT =================
  await supabase.from('audit_logs').insert({
    action: 'UPDATE',
    entity_type: 'ACADEMIC_TERM',
    entity_id: id,
    new_value: {
      is_active: true,
      is_locked: false
    }
  })

  return { success: true }
})
