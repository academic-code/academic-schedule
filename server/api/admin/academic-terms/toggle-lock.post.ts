import { readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { id, is_locked } = await readBody(event)

  if (!id || typeof is_locked !== 'boolean') {
    throw createError({
      statusCode: 400,
      message: 'Invalid payload'
    })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  // ================= VALIDATE ACTIVE =================
  const { data: term } = await supabase
    .from('academic_terms')
    .select('is_active')
    .eq('id', id)
    .single()

  if (!term?.is_active) {
    throw createError({
      statusCode: 400,
      message: 'Only the active term can be locked'
    })
  }

  // ================= UPDATE =================
  const { error } = await supabase
    .from('academic_terms')
    .update({ is_locked })
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // ================= AUDIT =================
  await supabase.from('audit_logs').insert({
    action: 'UPDATE',
    entity_type: 'ACADEMIC_TERM',
    entity_id: id,
    new_value: { is_locked }
  })

  return { success: true }
})
