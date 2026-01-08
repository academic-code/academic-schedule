import { defineEventHandler, getQuery } from "h3"
import { requireDeanWithSupabase } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId } = await requireDeanWithSupabase(event)
  const query = getQuery(event)

  const {
    program,
    curriculum_id,
    year_level,
    semester,
    search
  } = query

  let q = supabase
    .from("subjects")
    .select(`
      id,
      course_code,
      description,
      subject_type,
      year_level,
      semester,
      lec_units,
      lab_units,
      total_units,
      is_locked,
      curriculum:curriculums!inner (
        id,
        program,
        curriculum_code,
        effective_year
      )
    `)
    .eq("department_id", departmentId)

  if (program) q = q.eq("curriculum.program", program)
  if (curriculum_id) q = q.eq("curriculum_id", curriculum_id)
  if (year_level) q = q.eq("year_level", Number(year_level))
  if (semester) q = q.eq("semester", Number(semester))

  if (search) {
    q = q.or(
      `course_code.ilike.%${search}%,description.ilike.%${search}%`
    )
  }

  const { data, error } = await q.order("course_code")
  if (error) throw error
  return data ?? []
})
