// server/api/dean/subjects/_helpers.ts
import { H3Event, createError, getHeader } from "h3"
import { createClient } from "@supabase/supabase-js"

export async function requireDeanWithSupabase(event: H3Event) {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const authHeader = getHeader(event, "authorization")
  if (!authHeader) {
    throw createError({ statusCode: 401, message: "Missing auth header" })
  }

  const token = authHeader.replace("Bearer ", "").trim()
  const { data: authData } = await supabase.auth.getUser(token)

  if (!authData?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" })
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, role, is_active, department_id")
    .eq("id", authData.user.id)
    .single()

  if (!user || user.role !== "DEAN" || !user.is_active) {
    throw createError({ statusCode: 403, message: "Dean access only" })
  }

  const { data: dean } = await supabase
    .from("deans")
    .select("department_id")
    .eq("user_id", user.id)
    .single()

  if (!dean?.department_id) {
    throw createError({ statusCode: 403, message: "Dean department missing" })
  }

  return {
    supabase,
    userId: user.id,
    departmentId: dean.department_id
  }
}

export async function assertAcademicTermUnlocked(supabase: any) {
  const { data: term } = await supabase
    .from("academic_terms")
    .select("is_locked")
    .eq("is_active", true)
    .maybeSingle()

  if (term?.is_locked) {
    throw createError({
      statusCode: 403,
      message: "Academic term is locked"
    })
  }
}
