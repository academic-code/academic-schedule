import { defineEventHandler, readBody, createError } from 'h3'
import { requireScheduleAuthority, assertDeptWrite } from './_helpers/requireScheduleAuthority'
import { emitAudit } from './_helpers/emitAudit'

export default defineEventHandler(async (event) => {
  const auth = await requireScheduleAuthority(event)
  const { schedule_id } = await readBody(event)

  if (!schedule_id) throw createError({ statusCode: 400, message: 'Missing schedule_id' })

  const { data: schedule } = await auth.supabase
    .from('schedules')
    .select('*, academic_terms(is_locked)')
    .eq('id', schedule_id)
    .single()

  if (!schedule) throw createError({ statusCode: 404, message: 'Schedule not found' })
  if (schedule.academic_terms?.is_locked) throw createError({ statusCode: 403, message: 'Academic term is locked' })

  if (auth.role === 'DEAN') {
    assertDeptWrite(auth.departmentId, schedule.owner_department_id)
  }

  if (schedule.status !== 'PUBLISHED') {
    throw createError({ statusCode: 400, message: 'Only published schedules can be archived' })
  }

  await auth.supabase.from('schedules').update({ status: 'ARCHIVED' }).eq('id', schedule_id)

  await emitAudit(
    auth.supabase,
    auth.userId,
    'ARCHIVE',
    schedule_id,
    schedule,
    { ...schedule, status: 'ARCHIVED' }
  )

  return { success: true }
})