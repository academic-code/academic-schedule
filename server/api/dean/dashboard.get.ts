import { defineEventHandler, createError } from "h3"
import { createClient } from "@supabase/supabase-js"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  /* ---------- SECURITY ---------- */
  const { departmentId, userId } = await requireDean(event)

  /* ---------- DEAN USER ---------- */
  const { data: deanUser } = await supabase
    .from("users")
    .select("id, email, first_name, middle_name, last_name")
    .eq("id", userId)
    .single()

  if (!deanUser) {
    throw createError({ statusCode: 404, message: "Dean not found" })
  }

  const fullName = [
    deanUser.first_name,
    deanUser.middle_name,
    deanUser.last_name
  ].filter(Boolean).join(" ")

  /* ---------- DEPARTMENT ---------- */
  const { data: department } = await supabase
    .from("departments")
    .select("id, name, department_type")
    .eq("id", departmentId)
    .single()

  if (!department) {
    throw createError({ statusCode: 404, message: "Department not found" })
  }

  /* ---------- ACTIVE TERM ---------- */
  const { data: academicTerm } = await supabase
    .from("academic_terms")
    .select("id, academic_year, semester, is_active, is_locked")
    .eq("is_active", true)
    .maybeSingle()

  /* ---------- SUBJECT COUNT (FINAL RULE) ---------- */
  let subjectsCount = 0

  if (department.department_type === "REGULAR") {
    // All subjects connected to this department's curriculums
    const { data: curriculums } = await supabase
      .from("curriculums")
      .select("id")
      .eq("department_id", departmentId)

    const curriculumIds = curriculums?.map(c => c.id) ?? []

    if (curriculumIds.length) {
      const { count } = await supabase
        .from("subjects")
        .select("id", { count: "exact", head: true })
        .in("curriculum_id", curriculumIds)

      subjectsCount = count ?? 0
    }
  } else {
    // GENED / PE_NSTP → subjects owned by department
    const { count } = await supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId)

    subjectsCount = count ?? 0
  }

  /* ---------- OTHER STATS ---------- */
  const [
    classesRes,
    facultyRes,
    draftSchedulesRes,
    publishedSchedulesRes
  ] = await Promise.all([
    department.department_type === "REGULAR"
      ? supabase.from("classes")
          .select("id", { count: "exact", head: true })
          .eq("department_id", departmentId)
      : Promise.resolve({ count: 0 }),

    supabase.from("faculty")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId),

    supabase.from("schedules")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId)
      .eq("status", "DRAFT"),

    supabase.from("schedules")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId)
      .eq("status", "PUBLISHED")
  ])

  /* ---------- WARNINGS ---------- */
  const [
    unassignedClassesRes,
    inactiveFacultyRes
  ] = await Promise.all([
    department.department_type === "REGULAR"
      ? supabase.from("classes")
          .select("id", { count: "exact", head: true })
          .eq("department_id", departmentId)
          .is("adviser_id", null)
      : Promise.resolve({ count: 0 }),

    supabase.from("faculty")
      .select("id", { count: "exact", head: true })
      .eq("department_id", departmentId)
      .eq("is_active", false)
  ])

  /* ---------- NOTIFICATIONS ---------- */
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, message, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10)

  /* ---------- ACTIVITY ---------- */
  const { data: recentActivity } = await supabase
    .from("audit_logs")
    .select("action, entity_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10)

  return {
    dean: {
      id: deanUser.id,
      email: deanUser.email,
      full_name: fullName || "Dean"
    },

    department,

    academic_term: academicTerm ?? {
      id: null,
      academic_year: null,
      semester: null,
      is_active: false,
      is_locked: false
    },

    stats: {
      classes: classesRes.count ?? 0,
      subjects: subjectsCount,
      faculty: facultyRes.count ?? 0,
      draft_schedules: draftSchedulesRes.count ?? 0,
      published_schedules: publishedSchedulesRes.count ?? 0
    },

    warnings: {
      unassigned_classes: unassignedClassesRes.count ?? 0,
      inactive_faculty: inactiveFacultyRes.count ?? 0,
      locked_subjects: 0
    },

    notifications: notifications ?? [],
    recent_activity: recentActivity ?? []
  }
})
