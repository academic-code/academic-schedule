import { defineEventHandler, getQuery, createError } from 'h3'
import { requireScheduleAuthority } from './_helpers/requireScheduleAuthority'

export default defineEventHandler(async (event) => {
  const auth = await requireScheduleAuthority(event)
  const q = getQuery(event)

  const termId = q.academic_term_id as string | undefined
  const classId = q.class_id as string | undefined
  if (!termId || !classId) throw createError({ statusCode: 400, message: 'academic_term_id and class_id required' })

  // Get class to know its department (target dept)
  const { data: cls } = await auth.supabase
    .from('classes')
    .select('department_id')
    .eq('id', classId)
    .single()

  if (!cls) throw createError({ statusCode: 404, message: 'Class not found' })

  // Regular dean cannot read other dept classes
  if (auth.role === 'DEAN' && auth.departmentType === 'REGULAR' && cls.department_id !== auth.departmentId) {
    throw createError({ statusCode: 403, message: 'Cross-department denied' })
  }

  const { data, error } = await auth.supabase
    .from('schedules')
    .select('*')
    .eq('academic_term_id', termId)
    .eq('class_id', classId)
    .neq('status', 'ARCHIVED')

  if (error) throw error
  return data ?? []
})