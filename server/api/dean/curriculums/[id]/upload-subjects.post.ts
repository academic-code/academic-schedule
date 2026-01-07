import { defineEventHandler, createError } from "h3"
import { requireDean } from "../_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, userId, departmentId } = await requireDean(event)
  const curriculumId = event.context.params?.id

  if (!curriculumId) {
    throw createError({ statusCode: 400, message: "Missing curriculum id" })
  }

  const form = await readMultipartFormData(event)
  const file = form?.find(f => f.name === "file")

  if (!file?.data) {
    throw createError({ statusCode: 400, message: "CSV file required" })
  }

  const text = Buffer.from(file.data).toString("utf-8")
  const lines = text.split(/\r?\n/).filter(Boolean)

  const headers = lines[0].split(",").map(h => h.trim())
  const REQUIRED = ["course_code", "description", "year_level", "semester"]

  if (!REQUIRED.every(h => headers.includes(h))) {
    throw createError({ statusCode: 400, message: "Invalid CSV headers" })
  }

  let imported = 0
  let skipped = 0
  const total = lines.length - 1

  for (const line of lines.slice(1)) {
    const values = line.split(",").map(v => v.trim())
    const row: any = {}
    headers.forEach((h, i) => (row[h] = values[i]))

    if (
      !row.course_code ||
      !row.description ||
      !row.year_level ||
      ![1, 2, 3].includes(Number(row.semester))
    ) {
      skipped++
      continue
    }

    const code = row.course_code.toUpperCase()
    const subject_type =
      code.startsWith("G") ? "GENED" :
      code.startsWith("PATHFIT") || code.startsWith("NSTP") ? "PE_NSTP" :
      "MAJOR"

    const { error } = await supabase.from("subjects").insert({
      department_id: departmentId,
      curriculum_id: curriculumId,
      subject_type,
      course_code: row.course_code,
      description: row.description,
      year_level: Number(row.year_level),
      semester: Number(row.semester),
      lec_units: Number(row.lec_units ?? 0),
      lab_units: Number(row.lab_units ?? 0)
    })

    // Duplicate per curriculum only
    if (error?.code === "23505") {
      skipped++
      continue
    }

    if (error) throw error

    imported++
  }

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "CREATE",
    entity_type: "CURRICULUM_SUBJECT_UPLOAD",
    entity_id: curriculumId,
    new_value: { total, imported, skipped }
  })

  return { total, imported, skipped }
})
