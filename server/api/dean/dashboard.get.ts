import { defineEventHandler, createError } from "h3"
import { createClient } from "@supabase/supabase-js"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  // ---------------- SECURITY ----------------
  const { departmentId, userId } = await requireDean(event)

  /* ---------------- DEAN USER ---------------- */
  const { data: deanUser, error: deanErr } = await supabase
    .from("users")
    .select("id, email, first_name, middle_name, last_name")
    .eq("id", userId)
    .single()

  if (deanErr || !deanUser) {
    throw createError({
      statusCode: 404,
      message: "Dean user not found"
    })
  }

  const fullName = [
    deanUser.first_name,
    deanUser.middle_name,
    deanUser.last_name
  ]
    .filter(Boolean)
    .join(" ")

  /* ---------------- DEPARTMENT ---------------- */
  const { data: department, error: deptErr } = await supabase
    .from("departments")
    .select("id, name, department_type")
    .eq("id", departmentId)
    .single()

  if (deptErr || !department) {
    throw createError({
      statusCode: 404,
      message: "Department not found"
    })
  }

  /* ---------------- ACTIVE TERM ---------------- */
  const { data: academicTerm } = await supabase
    .from("academic_terms")
    .select("id, academic_year, semester, is_active, is_locked")
    .eq("is_active", true)
    .maybeSingle()

  /* ---------------- STATS ---------------- */
  const [
    classesRes,
    subjectsRes,
    facultyRes,
    draftSchedulesRes,
    publishedSchedulesRes
  ] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("department_id", departmentId),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("department_id", departmentId).eq("subject_type", "MAJOR"),
    supabase.from("faculty").select("id", { count: "exact", head: true }).eq("department_id", departmentId),
    supabase.from("schedules").select("id", { count: "exact", head: true }).eq("department_id", departmentId).eq("status", "DRAFT"),
    supabase.from("schedules").select("id", { count: "exact", head: true }).eq("department_id", departmentId).eq("status", "PUBLISHED")
  ])

  /* ---------------- WARNINGS ---------------- */
  const [
    unassignedClassesRes,
    inactiveFacultyRes,
    lockedSubjectsRes
  ] = await Promise.all([
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("department_id", departmentId).is("adviser_id", null),
    supabase.from("faculty").select("id", { count: "exact", head: true }).eq("department_id", departmentId).eq("is_active", false),
    supabase.from("subjects").select("id", { count: "exact", head: true }).eq("department_id", departmentId).eq("is_locked", true)
  ])

  /* ---------------- NOTIFICATIONS ---------------- */
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, message, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  /* ---------------- RECENT ACTIVITY ---------------- */
  const { data: recentActivity } = await supabase
    .from("audit_logs")
    .select("action, entity_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  return {
    dean: {
      id: deanUser.id,
      email: deanUser.email,
      full_name: fullName || "Dean"
    },

    department,

    academic_term: academicTerm
      ? {
          id: academicTerm.id,
          academic_year: academicTerm.academic_year,
          semester: academicTerm.semester,
          is_active: academicTerm.is_active,
          is_locked: academicTerm.is_locked
        }
      : {
          id: null,
          academic_year: null,
          semester: null,
          is_active: false,
          is_locked: false
        },

    stats: {
      classes: classesRes.count ?? 0,
      subjects: subjectsRes.count ?? 0,
      faculty: facultyRes.count ?? 0,
      draft_schedules: draftSchedulesRes.count ?? 0,
      published_schedules: publishedSchedulesRes.count ?? 0
    },

    warnings: {
      unassigned_classes: unassignedClassesRes.count ?? 0,
      inactive_faculty: inactiveFacultyRes.count ?? 0,
      locked_subjects: lockedSubjectsRes.count ?? 0
    },

    notifications: notifications ?? [],
    recent_activity: recentActivity ?? []
  }
})
