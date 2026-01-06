// server/api/dean/subjects/index.get.ts
import { defineEventHandler, getQuery } from "h3"
import { requireDeanWithSupabase } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId } = await requireDeanWithSupabase(event)
  const query = getQuery(event)

  const curriculumId = query.curriculum_id as string | undefined
  const yearLevel = query.year_level ? Number(query.year_level) : undefined
  const semester = query.semester ? Number(query.semester) : undefined

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
      curriculum:curriculums (
        id,
        curriculum_code,
        effective_year
      )
    `)
    .eq("department_id", departmentId)

  if (curriculumId) q = q.eq("curriculum_id", curriculumId)
  if (yearLevel) q = q.eq("year_level", yearLevel)
  if (semester) q = q.eq("semester", semester)

  const { data, error } = await q.order("course_code")

  if (error) throw error
  return data ?? []
})
