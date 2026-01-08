import { defineEventHandler, createError } from "h3"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, userId, departmentId } = await requireDean(event)
  const curriculumId = event.context.params?.id

  if (!curriculumId) {
    throw createError({
      statusCode: 400,
      message: "Missing curriculum id"
    })
  }

  // 1️⃣ Get all subjects under this curriculum
  const { data: subjects, error: subjectErr } = await supabase
    .from("subjects")
    .select("id")
    .eq("curriculum_id", curriculumId)
    .eq("department_id", departmentId)

  if (subjectErr) throw subjectErr

  const subjectIds = subjects?.map(s => s.id) ?? []

  // 2️⃣ If subjects exist, check schedules
  if (subjectIds.length > 0) {
    const { count: scheduleCount, error: scheduleErr } = await supabase
      .from("schedules")
      .select("id", { count: "exact", head: true })
      .in("subject_id", subjectIds)

    if (scheduleErr) throw scheduleErr

    if ((scheduleCount ?? 0) > 0) {
      throw createError({
        statusCode: 409,
        message:
          "Cannot delete curriculum. One or more subjects are already used in schedules."
      })
    }
  }

  // 3️⃣ Safe to delete curriculum
  const { error: deleteErr } = await supabase
    .from("curriculums")
    .delete()
    .eq("id", curriculumId)
    .eq("department_id", departmentId)

  if (deleteErr) throw deleteErr

  // 4️⃣ Audit log
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "DELETE",
    entity_type: "CURRICULUM",
    entity_id: curriculumId
  })

  return { success: true }
})
