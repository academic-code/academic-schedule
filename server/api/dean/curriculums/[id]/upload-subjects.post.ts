import { defineEventHandler, createError } from "h3"
import { requireDean } from "../_helpers"

/* ================= TYPES ================= */

interface CSVSubjectRow {
  course_code: string
  description: string
  year_level: string
  semester: string
  lec_units?: string
  lab_units?: string
}

/* ================= UTILS ================= */

function parseCSV(text: string): CSVSubjectRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map(h => h.trim())

  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim())
    const row: any = {}

    headers.forEach((h, i) => {
      row[h] = values[i]
    })

    return row as CSVSubjectRow
  })
}

/* ================= HANDLER ================= */

export default defineEventHandler(async (event) => {
  const { supabase, userId, departmentId } = await requireDean(event)

  const curriculumId = event.context.params?.id
  if (!curriculumId) {
    throw createError({ statusCode: 400, message: "Missing curriculum id" })
  }

  const form = await readMultipartFormData(event)
  const file = form?.find(f => f.name === "file")

  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: "CSV file is required" })
  }

  /* ================= READ FILE ================= */

  const csvText = Buffer.from(file.data).toString("utf-8")
  const rows = parseCSV(csvText)

  if (!rows.length) {
    throw createError({
      statusCode: 400,
      message: "CSV file is empty or invalid"
    })
  }

  /* ================= INSERT ================= */

  for (const row of rows) {
    if (
      !row.course_code ||
      !row.description ||
      !row.year_level ||
      !row.semester
    ) {
      continue // skip invalid rows
    }

    const { error } = await supabase.from("subjects").insert({
      department_id: departmentId,
      curriculum_id: curriculumId,
      subject_type: "MAJOR",
      course_code: row.course_code.trim(),
      description: row.description.trim(),
      year_level: Number(row.year_level),
      semester: Number(row.semester),
      lec_units: Number(row.lec_units ?? 0),
      lab_units: Number(row.lab_units ?? 0)
    })

    // Ignore duplicates silently (unique constraint handles it)
    if (error && error.code !== "23505") {
      throw error
    }
  }

  /* ================= AUDIT LOG ================= */

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "CREATE",
    entity_type: "CURRICULUM_SUBJECT_UPLOAD",
    entity_id: curriculumId,
    new_value: {
      uploaded_rows: rows.length
    }
  })

  return {
    success: true,
    imported: rows.length
  }
})
