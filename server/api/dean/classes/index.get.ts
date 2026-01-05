import { defineEventHandler } from "h3"
import { requireDeanWithSupabase } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId } = await requireDeanWithSupabase(event)

  const { data: term } = await supabase
    .from("academic_terms")
    .select("id, is_locked")
    .eq("is_active", true)
    .maybeSingle()

  const { data: classes } = await supabase
    .from("classes")
    .select(`
      id, program, year_level, section, remarks,
      adviser:faculty ( id, first_name, last_name )
    `)
    .eq("department_id", departmentId)
    .order("year_level")
    .order("section")

  const { data: schedules } = term?.id
    ? await supabase
        .from("schedules")
        .select("class_id, status")
        .eq("academic_term_id", term.id)
    : { data: [] }

  const map = new Map<string, string>()
  schedules?.forEach(s =>
    map.set(s.class_id, s.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT")
  )

  return (classes ?? []).map(cls => ({
    ...cls,
    status: term?.is_locked
      ? "LOCKED"
      : map.get(cls.id) ?? "NO_SCHEDULE"
  }))
})
