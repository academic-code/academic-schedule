import { defineEventHandler } from "h3"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId } = await requireDean(event)

  const { data, error } = await supabase
    .from("curriculums")
    .select(`
      *,
      subjects_count:subjects(count),
      schedules_count:subjects(
        schedules(count)
      )
    `)
    .eq("department_id", departmentId)
    .order("effective_year", { ascending: false })

  if (error) throw error

  return (data ?? []).map(c => ({
    ...c,
    subjects_count: c.subjects_count?.[0]?.count ?? 0,
    is_locked: (c.schedules_count?.[0]?.count ?? 0) > 0
  }))
})
