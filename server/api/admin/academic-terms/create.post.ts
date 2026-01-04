import { readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { academic_year, semester } = await readBody(event)

  if (!academic_year || !semester) {
    throw createError({
      statusCode: 400,
      message: 'Academic year and semester are required'
    })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  // ================= DUPLICATE GUARD =================
  const { data: exists } = await supabase
    .from('academic_terms')
    .select('id')
    .eq('academic_year', academic_year)
    .eq('semester', semester)
    .maybeSingle()

  if (exists) {
    throw createError({
      statusCode: 409,
      message: 'Academic year and semester already exists'
    })
  }

  // ================= INSERT =================
  const { data: created, error } = await supabase
    .from('academic_terms')
    .insert({
      academic_year,
      semester,
      is_active: false,
      is_locked: false
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // ================= AUDIT =================
  await supabase.from('audit_logs').insert({
    action: 'CREATE',
    entity_type: 'ACADEMIC_TERM',
    entity_id: created.id,
    new_value: {
      academic_year,
      semester
    }
  })

  return { success: true }
})
