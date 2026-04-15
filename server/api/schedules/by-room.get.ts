import { defineEventHandler, getQuery, createError } from 'h3'
import { requireScheduleAuthority } from './_helpers/requireScheduleAuthority'

export default defineEventHandler(async (event) => {
  const auth = await requireScheduleAuthority(event)
  const q = getQuery(event)

  const termId = q.academic_term_id as string | undefined
  const roomId = q.room_id as string | undefined
  if (!termId || !roomId) throw createError({ statusCode: 400, message: 'academic_term_id and room_id required' })

  let query = auth.supabase
    .from('schedules')
    .select('*')
    .eq('academic_term_id', termId)
    .eq('room_id', roomId)
    .neq('status', 'ARCHIVED')

  // Regular dean only sees their target dept room usage (optional)
  if (auth.role === 'DEAN' && auth.departmentType === 'REGULAR') {
    query = query.eq('target_department_id', auth.departmentId)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
})