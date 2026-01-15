import { defineEventHandler, readBody, createError } from "h3"
import {
  requireScheduleAuthority,
  assertDepartment
} from "./_helpers/requireScheduleAuthority"
import { validateSchedule } from "./_helpers/validateSchedule"
import { validateLifecycle } from "./_helpers/validateLifecycle"
import { detectConflicts } from "./_helpers/detectConflicts"
import { expandPeriods } from "./_helpers/expandPeriods"
import { emitAudit, ScheduleAuditAction } from "./_helpers/emitAudit"
import { emitNotifications } from "./_helpers/emitNotifications"

export default defineEventHandler(async (event) => {
  const auth = await requireScheduleAuthority(event)
  const payload = await readBody(event)

  if (!payload) {
    throw createError({ statusCode: 400, message: "Missing payload" })
  }

  /* ===============================
   * FETCH OLD (FOR UPDATE)
   * =============================== */
  const { data: old } = payload.id
    ? await auth.supabase
        .from("schedules")
        .select("*")
        .eq("id", payload.id)
        .single()
    : { data: null }

  if (old) {
    assertDepartment(auth.role, auth.departmentId, old.department_id)
  }

  /* ===============================
   * LIFECYCLE + VALIDATION
   * =============================== */
  validateLifecycle(old?.status ?? null, payload.status)
  await validateSchedule(auth.supabase, payload, auth.departmentId)

  /* ===============================
   * CONFLICT CHECK
   * =============================== */
  if (payload.status === "PUBLISHED") {
    const conflicts = await detectConflicts(auth.supabase, payload)
    if (conflicts.length) {
      return { success: false, conflicts }
    }
  }

  /* ===============================
   * SAVE SCHEDULE
   * =============================== */
  const { data: schedule } = await auth.supabase
    .from("schedules")
    .upsert({ ...payload, created_by: auth.userId })
    .select()
    .single()

  if (!schedule) {
    throw createError({ statusCode: 500, message: "Failed to save schedule" })
  }

  /* ===============================
   * REBUILD PERIODS
   * =============================== */
  await auth.supabase
    .from("schedule_periods")
    .delete()
    .eq("schedule_id", schedule.id)

  const rows = await expandPeriods(
    auth.supabase,
    schedule.id,
    schedule.start_period_id,
    schedule.end_period_id
  )

  if (rows.length) {
    await auth.supabase.from("schedule_periods").insert(rows)
  }

  /* ===============================
   * AUDIT (ONCE)
   * =============================== */
  const action: ScheduleAuditAction =
    !old
      ? "CREATE"
      : payload.is_simulation
      ? "SIMULATE"
      : payload.status === "PUBLISHED"
      ? "PUBLISH"
      : "UPDATE"

  await emitAudit(
    auth.supabase,
    auth.userId,
    action,
    schedule.id,
    old,
    schedule
  )

  /* ===============================
   * NOTIFICATIONS
   * =============================== */
  await emitNotifications(auth.supabase, schedule)

  return { success: true, schedule }
})
