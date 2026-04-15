import { defineEventHandler, readBody, createError } from 'h3'
import { requireScheduleAuthority, assertDeptWrite } from './_helpers/requireScheduleAuthority'
import type { SchedulePayload } from './_helpers/types'
import { validateLifecycle } from './_helpers/validateLifecycle'
import { validateSchedule } from './_helpers/validateSchedule'
import { detectConflicts } from './_helpers/detectConflicts'
import { expandPeriods } from './_helpers/expandPeriods'
import { emitAudit, ScheduleAuditAction } from './_helpers/emitAudit'
import { emitNotifications } from './_helpers/emitNotifications'

export default defineEventHandler(async (event) => {
  const auth = await requireScheduleAuthority(event)
  const payload = (await readBody(event)) as SchedulePayload

  if (!payload) throw createError({ statusCode: 400, message: 'Missing payload' })

  // Must always set legacy department_id = target_department_id (CHECK exists)
  payload.department_id = payload.target_department_id

  // Owner-only writes for Deans (Admin allowed optionally)
  if (auth.role === 'DEAN') {
    assertDeptWrite(auth.departmentId, payload.owner_department_id)
  }

  // Fetch old (update case)
  const { data: old } = payload.id
    ? await auth.supabase.from('schedules').select('*').eq('id', payload.id).single()
    : { data: null }

  if (old && auth.role === 'DEAN') {
    // must also be owner on update
    assertDeptWrite(auth.departmentId, old.owner_department_id)
  }

  // Lifecycle
  validateLifecycle(old?.status ?? null, payload.status)

  // Full validation (term lock, subject type authority, room/faculty optional rules)
  await validateSchedule(auth.supabase, payload, {
    departmentId: auth.departmentId,
    departmentType: auth.departmentType
  })

  // Conflict check on publish only
  if (payload.status === 'PUBLISHED') {
    const conflicts = await detectConflicts(auth.supabase, payload)
    if (conflicts.length) return { success: false, conflicts }
  }

  // Upsert schedule
  const { data: schedule, error: saveErr } = await auth.supabase
    .from('schedules')
    .upsert({ ...payload, created_by: auth.userId })
    .select()
    .single()

  if (saveErr || !schedule) {
    throw createError({ statusCode: 500, message: saveErr?.message || 'Failed to save schedule' })
  }

  // Rebuild schedule_periods
  await auth.supabase.from('schedule_periods').delete().eq('schedule_id', schedule.id)

  const rows = await expandPeriods(
    auth.supabase,
    schedule.id,
    schedule.start_period_id,
    schedule.end_period_id
  )

  if (rows.length) {
    const { error: spErr } = await auth.supabase.from('schedule_periods').insert(rows)
    if (spErr) throw spErr
  }

  // Audit
  const action: ScheduleAuditAction =
    !old ? 'CREATE'
    : payload.is_simulation ? 'SIMULATE'
    : payload.status === 'PUBLISHED' ? 'PUBLISH'
    : 'UPDATE'

  await emitAudit(auth.supabase, auth.userId, action, schedule.id, old, schedule)

  // Notifications (only if published + faculty exists)
  await emitNotifications(auth.supabase, schedule)

  return { success: true, schedule }
})