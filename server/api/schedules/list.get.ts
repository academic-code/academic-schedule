import { defineEventHandler, createError, getQuery } from 'h3'
import { requireScheduleAuthority } from './_helpers/requireScheduleAuthority'

export default defineEventHandler(async (event) => {
  const auth = await requireScheduleAuthority(event)
  const query = getQuery(event)

  const termId = (query.term_id as string) || ''

  if (!termId) {
    throw createError({ statusCode: 400, message: 'term_id is required' })
  }

  // RLS already restricts what rows the dean can see (target_department_id rules)
  const { data, error } = await auth.supabase
    .from('schedules')
    .select('*')
    .eq('academic_term_id', termId)
    .neq('status', 'ARCHIVED')
    .order('day', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data ?? []
})