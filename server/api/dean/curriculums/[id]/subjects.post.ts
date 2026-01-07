import { defineEventHandler, createError } from "h3"
import { requireDean } from "../_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId } = await requireDean(event)
  const curriculumId = event.context.params?.id

  if (!curriculumId) {
    throw createError({ statusCode: 400, message: "Missing curriculum id" })
  }

  const { data, error } = await supabase
    .from("subjects")
    .select("course_code, year_level, semester")
    .eq("curriculum_id", curriculumId)
    .eq("department_id", departmentId)

  if (error) throw error
  return data ?? []
})
