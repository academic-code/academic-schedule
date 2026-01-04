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

  // ================= CHECK ACTIVE =================
  const { data: term } = await supabase
    .from('academic_terms')
    .select('is_active')
    .eq('id', id)
    .single()

  if (term?.is_active) {
    throw createError({
      statusCode: 400,
      message: 'Cannot delete active academic term'
    })
  }

  // ================= DELETE =================
  const { error } = await supabase
    .from('academic_terms')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // ================= AUDIT =================
  await supabase.from('audit_logs').insert({
    action: 'DELETE',
    entity_type: 'ACADEMIC_TERM',
    entity_id: id
  })

  return { success: true }
})
