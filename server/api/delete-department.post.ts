import { defineEventHandler, readBody } from "h3"
import { createClient } from "@supabase/supabase-js"

// SERVICE ROLE CLIENT
const supabaseAdmin = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DeanRow {
  id: string
  department_id: string
  user: any | null // user may be object or array → normalize later
}

export default defineEventHandler(async (event) => {
  const { department_id } = await readBody(event)

  if (!department_id) {
    return { error: "Missing department_id" }
  }

  try {
    /* -------------------------------------------------------
       1) Fetch dean for department (may return array)
    ------------------------------------------------------- */
    const { data: deanRaw } = await supabaseAdmin
      .from("deans")
      .select("id, department_id, user:users(*)")
      .eq("department_id", department_id)

    let dean: DeanRow | null = null

    if (Array.isArray(deanRaw) && deanRaw.length > 0) {
      const d = deanRaw[0]

      dean = {
        id: d.id,
        department_id: d.department_id,
        user: Array.isArray(d.user) ? d.user[0] ?? null : d.user ?? null
      }
    }

    /* -------------------------------------------------------
       2) Delete dean auth + users + dean row
    ------------------------------------------------------- */
    if (dean?.user) {
      const authUserId = dean.user.auth_user_id
      const userTableId = dean.user.id

      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
      }

      if (userTableId) {
        await supabaseAdmin.from("users").delete().eq("id", userTableId)
      }

      await supabaseAdmin.from("deans").delete().eq("id", dean.id)
    }

    /* -------------------------------------------------------
       3) Delete faculty
    ------------------------------------------------------- */
    await supabaseAdmin.from("faculty").delete().eq("department_id", department_id)

    /* -------------------------------------------------------
       4) Delete subjects
    ------------------------------------------------------- */
    await supabaseAdmin.from("subjects").delete().eq("department_id", department_id)

    /* -------------------------------------------------------
       5) Delete classes
    ------------------------------------------------------- */
    await supabaseAdmin.from("classes").delete().eq("department_id", department_id)

    /* -------------------------------------------------------
       6) Delete schedules + schedule_periods
    ------------------------------------------------------- */
    const { data: schedules } = await supabaseAdmin
      .from("schedules")
      .select("id")
      .eq("department_id", department_id)

    if (Array.isArray(schedules) && schedules.length > 0) {
      const ids = schedules.map((s) => s.id)

      await supabaseAdmin.from("schedule_periods").delete().in("schedule_id", ids)
      await supabaseAdmin.from("schedules").delete().in("id", ids)
    }

    /* -------------------------------------------------------
       7) Delete department LAST
    ------------------------------------------------------- */
    await supabaseAdmin.from("departments").delete().eq("id", department_id)

    return { success: true }
  } catch (err) {
    console.error("DELETE DEPARTMENT ERROR:", err)
    return { error: "Failed to delete department" }
  }
})
