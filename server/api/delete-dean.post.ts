import { defineEventHandler, readBody } from 'h3'
import { createServerClient } from '@supabase/ssr'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { dean_id, user_table_id, auth_user_id } = body

  if (!dean_id || !user_table_id) {
    return { error: "Missing required identifiers." }
  }

  const supabase = createServerClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => "",
        set: () => {},
        remove: () => {}
      }
    }
  )

  // ==========================================
  // 1) Get schedule IDs for this dean
  // ==========================================
  const { data: schedules, error: scheduleErr } = await supabase
    .from("schedules")
    .select("id")
    .eq("department_id", dean_id)

  if (scheduleErr) return { error: scheduleErr.message }

  const scheduleIds = schedules?.map((s) => s.id) ?? []

  // ==========================================
  // 2) Delete schedule_periods
  // ==========================================
  if (scheduleIds.length > 0) {
    const { error: spErr } = await supabase
      .from("schedule_periods")
      .delete()
      .in("schedule_id", scheduleIds)

    if (spErr) return { error: spErr.message }
  }

  // ==========================================
  // 3) Delete schedules
  // ==========================================
  await supabase.from("schedules").delete().eq("department_id", dean_id)

  // ==========================================
  // 4) Delete related data: classes, subjects, faculty
  // ==========================================
  await supabase.from("classes").delete().eq("department_id", dean_id)
  await supabase.from("subjects").delete().eq("department_id", dean_id)
  await supabase.from("faculty").delete().eq("department_id", dean_id)

  // ==========================================
  // 5) Delete dean row
  // ==========================================
  await supabase.from("deans").delete().eq("id", dean_id)

  // ==========================================
  // 6) Delete users table row
  // ==========================================
  await supabase.from("users").delete().eq("id", user_table_id)

  // ==========================================
  // 7) Delete Supabase Auth user (Optional)
  // ==========================================
  if (auth_user_id) {
    await supabase.auth.admin.deleteUser(auth_user_id)
  }

  return { success: true }
})
