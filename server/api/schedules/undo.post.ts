import { defineEventHandler, readBody, createError } from 'h3'
import { requireScheduleAuthority, assertDeptWrite } from './_helpers/requireScheduleAuthority'
import { validateLifecycle } from './_helpers/validateLifecycle'
import { validateSchedule } from './_helpers/validateSchedule'
import { detectConflicts } from './_helpers/detectConflicts'
import { expandPeriods } from './_helpers/expandPeriods'
import { emitAudit } from './_helpers/emitAudit'

export default defineEventHandler(async (event) => {
  const auth = await requireScheduleAuthority(event)
  const { audit_log_id } = await readBody(event)
  if (!audit_log_id) throw createError({ statusCode: 400, message: 'Missing audit_log_id' })

  const { data: log } = await auth.supabase
    .from('audit_logs')
    .select('*')
    .eq('id', audit_log_id)
    .single()

  if (!log || log.entity_type !== 'SCHEDULE' || !log.old_value) {
    throw createError({ statusCode: 400, message: 'Invalid undo target' })
  }

  const restored = log.old_value as any

  // Owner-only undo
  if (auth.role === 'DEAN') {
    assertDeptWrite(auth.departmentId, restored.owner_department_id)
  }

  // Term lock
  const { data: term } = await auth.supabase
    .from('academic_terms')
    .select('is_locked')
    .eq('id', restored.academic_term_id)
    .single()

  if (term?.is_locked) throw createError({ statusCode: 403, message: 'Academic term is locked' })

  // Current schedule must be archived
  const { data: current } = await auth.supabase
    .from('schedules')
    .select('status')
    .eq('id', restored.id)
    .single()

  if (!current || current.status !== 'ARCHIVED') {
    throw createError({ statusCode: 400, message: 'Only archived schedules can be undone' })
  }

  validateLifecycle(current.status, restored.status)

  await validateSchedule(auth.supabase, restored, {
    departmentId: auth.departmentId,
    departmentType: auth.departmentType
  })

  // Conflict check
  const conflicts = await detectConflicts(auth.supabase, restored)
  if (conflicts.length) {
    throw createError({ statusCode: 409, message: 'Undo causes schedule conflict' })
  }

  // Restore schedule
  const { data: schedule } = await auth.supabase
    .from('schedules')
    .upsert(restored)
    .select()
    .single()

  if (!schedule) throw createError({ statusCode: 500, message: 'Failed to restore schedule' })

  // Rebuild schedule_periods
  await auth.supabase.from('schedule_periods').delete().eq('schedule_id', schedule.id)

  const rows = await expandPeriods(auth.supabase, schedule.id, schedule.start_period_id, schedule.end_period_id)
  if (rows.length) await auth.supabase.from('schedule_periods').insert(rows)

  await emitAudit(auth.supabase, auth.userId, 'UPDATE', schedule.id, null, schedule)

  return { success: true }
})