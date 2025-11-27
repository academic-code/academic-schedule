import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { dean_id, user_table_id, auth_user_id } = body

  if (!dean_id || !user_table_id) {
    return { error: "Missing identifiers." }
  }

  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  /* -----------------------------------------------------
     1. Delete schedule periods 
  ----------------------------------------------------- */
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id")
    .eq("department_id", dean_id)

  const scheduleIds = schedules?.map(s => s.id) || []

  if (scheduleIds.length > 0) {
    await supabase
      .from("schedule_periods")
      .delete()
      .in("schedule_id", scheduleIds)
  }

  /* -----------------------------------------------------
     2. Delete schedules
  ----------------------------------------------------- */
  await supabase.from("schedules").delete().eq("department_id", dean_id)

  /* -----------------------------------------------------
     3. Delete classes, subjects, faculty
  ----------------------------------------------------- */
  await supabase.from("classes").delete().eq("department_id", dean_id)
  await supabase.from("subjects").delete().eq("department_id", dean_id)
  await supabase.from("faculty").delete().eq("department_id", dean_id)

  /* -----------------------------------------------------
     4. Delete dean record
  ----------------------------------------------------- */
  await supabase.from("deans").delete().eq("id", dean_id)

  /* -----------------------------------------------------
     5. Delete users table row
  ----------------------------------------------------- */
  await supabase.from("users").delete().eq("id", user_table_id)

  /* -----------------------------------------------------
     6. Delete Supabase Auth user
  ----------------------------------------------------- */
  if (auth_user_id) {
    await supabase.auth.admin.deleteUser(auth_user_id)
  }

  return { success: true }
})
