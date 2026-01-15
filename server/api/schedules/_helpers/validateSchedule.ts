import { createError } from "h3"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { SchedulePayload } from "./types"

export async function validateSchedule(
  supabase: SupabaseClient,
  payload: SchedulePayload,
  authDeptId: string
) {
  /* ===============================
   * PERIOD RANGE
   * =============================== */
  if (payload.start_period_id === payload.end_period_id) {
    throw createError({
      statusCode: 400,
      message: "Start and end period cannot be the same"
    })
  }

  /* ===============================
   * ACADEMIC TERM
   * =============================== */
  const { data: term } = await supabase
    .from("academic_terms")
    .select("is_active, is_locked, semester")
    .eq("id", payload.academic_term_id)
    .single()

  if (!term || !term.is_active || term.is_locked) {
    throw createError({
      statusCode: 403,
      message: "Academic term is invalid or locked"
    })
  }

  /* ===============================
   * SUBJECT
   * =============================== */
  const { data: subject } = await supabase
    .from("subjects")
    .select("subject_type, is_locked, semester")
    .eq("id", payload.subject_id)
    .single()

  if (!subject || subject.is_locked) {
    throw createError({
      statusCode: 400,
      message: "Invalid or locked subject"
    })
  }

  // Semester alignment
  if (subject.semester !== term.semester) {
    throw createError({
      statusCode: 400,
      message: "Subject semester does not match academic term"
    })
  }

  /* ===============================
   * DEPARTMENT
   * =============================== */
  const { data: dept } = await supabase
    .from("departments")
    .select("department_type")
    .eq("id", payload.department_id)
    .single()

  if (!dept) {
    throw createError({ statusCode: 400, message: "Invalid department" })
  }

  if (payload.department_id !== authDeptId) {
    throw createError({
      statusCode: 403,
      message: "Cross-department scheduling denied"
    })
  }

  if (
    (dept.department_type === "REGULAR" && subject.subject_type !== "MAJOR") ||
    (dept.department_type === "GENED" && subject.subject_type !== "GENED") ||
    (dept.department_type === "PE_NSTP" && subject.subject_type !== "PE_NSTP")
  ) {
    throw createError({
      statusCode: 400,
      message: "Subject type does not match department type"
    })
  }

 /* ===============================
 * CLASS
 * =============================== */
if (payload.class_id) {
  const { data: cls } = await supabase
    .from("classes")
    .select("department_id")
    .eq("id", payload.class_id)
    .single()

  if (!cls) {
    throw createError({ statusCode: 400, message: "Invalid class" })
  }

  if (dept.department_type === "REGULAR" && cls.department_id !== authDeptId) {
    throw createError({
      statusCode: 403,
      message: "Class does not belong to department"
    })
  }
}


  /* ===============================
   * FACULTY
   * =============================== */
  const { data: faculty } = await supabase
    .from("faculty")
    .select("is_active, department_id")
    .eq("id", payload.faculty_id)
    .single()

  if (!faculty || !faculty.is_active) {
    throw createError({
      statusCode: 400,
      message: "Invalid or inactive faculty"
    })
  }

  // REGULAR faculty restriction
  if (
    dept.department_type === "REGULAR" &&
    faculty.department_id !== authDeptId
  ) {
    throw createError({
      statusCode: 403,
      message: "Faculty does not belong to this department"
    })
  }

  /* ===============================
   * ROOM
   * =============================== */
  const { data: room } = await supabase
    .from("rooms")
    .select("is_active, room_type")
    .eq("id", payload.room_id)
    .single()

  if (!room || !room.is_active) {
    throw createError({
      statusCode: 400,
      message: "Invalid or inactive room"
    })
  }

  // Mode vs room-type validation
  if (payload.mode === "ONLINE" && room.room_type !== "ONLINE") {
    throw createError({
      statusCode: 400,
      message: "Online mode requires ONLINE room"
    })
  }

  if (payload.mode === "F2F" && room.room_type === "ONLINE") {
    throw createError({
      statusCode: 400,
      message: "F2F mode cannot use ONLINE room"
    })
  }
}
