import { H3Event, createError, getHeader } from "h3"
import { createClient } from "@supabase/supabase-js"

export async function requireDean(event: H3Event) {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  // ---------------- AUTH HEADER ----------------
  const authHeader = getHeader(event, "authorization")
  if (!authHeader) {
    throw createError({ statusCode: 401, message: "Missing auth header" })
  }

  const token = authHeader.replace("Bearer ", "").trim()
  if (!token) {
    throw createError({ statusCode: 401, message: "Invalid auth token" })
  }

  // ---------------- AUTH USER ----------------
  const { data: authData, error: authErr } =
    await supabase.auth.getUser(token)

  if (authErr || !authData?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" })
  }

  const authUser = authData.user

  // ---------------- USER ROW ----------------
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("id, role, is_active")
    .eq("id", authUser.id)
    .single()

  if (userErr || !userRow) {
    throw createError({ statusCode: 401, message: "Invalid user" })
  }

  if (userRow.role !== "DEAN") {
    throw createError({ statusCode: 403, message: "Dean access only" })
  }

  if (!userRow.is_active) {
    throw createError({ statusCode: 403, message: "Account inactive" })
  }

  // ---------------- DEAN ROW ----------------
  const { data: deanRow, error: deanErr } = await supabase
    .from("deans")
    .select("id, department_id")
    .eq("user_id", userRow.id)
    .single()

  if (deanErr || !deanRow) {
    throw createError({ statusCode: 403, message: "Dean record not found" })
  }

  if (!deanRow.department_id) {
    throw createError({
      statusCode: 403,
      message: "Dean has no department"
    })
  }

  return {
    userId: userRow.id,
    deanId: deanRow.id,
    departmentId: deanRow.department_id
  }
}
