import { defineEventHandler, getQuery, createError } from 'h3'
import { requireScheduleAuthority } from './_helpers/requireScheduleAuthority'

export default defineEventHandler(async (event) => {
  const auth = await requireScheduleAuthority(event)
  const q = getQuery(event)

  const termId = q.academic_term_id as string | undefined
  const facultyId = q.faculty_id as string | undefined
  if (!termId || !facultyId) throw createError({ statusCode: 400, message: 'academic_term_id and faculty_id required' })

  // Regular dean only sees faculty schedules when faculty belongs to their dept
  if (auth.role === 'DEAN' && auth.departmentType === 'REGULAR') {
    const { data: fac } = await auth.supabase
      .from('faculty')
      .select('department_id')
      .eq('id', facultyId)
      .single()

    if (!fac) throw createError({ statusCode: 404, message: 'Faculty not found' })
    if (fac.department_id !== auth.departmentId) {
      throw createError({ statusCode: 403, message: 'Cross-department denied' })
    }
  }

  const { data, error } = await auth.supabase
    .from('schedules')
    .select('*')
    .eq('academic_term_id', termId)
    .eq('faculty_id', facultyId)
    .neq('status', 'ARCHIVED')

  if (error) throw error
  return data ?? []
})