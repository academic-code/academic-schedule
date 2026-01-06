import { H3Event, getHeader, createError } from "h3"
import { createClient } from "@supabase/supabase-js"

export async function requireDean(event: H3Event) {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const auth = getHeader(event, "authorization")
  if (!auth) throw createError({ statusCode: 401, message: "Missing token" })

  const token = auth.replace("Bearer ", "")
  const { data } = await supabase.auth.getUser(token)

  if (!data?.user) {
    throw createError({ statusCode: 401, message: "Unauthorized" })
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, role, department_id")
    .eq("id", data.user.id)
    .single()

  if (!user || user.role !== "DEAN") {
    throw createError({ statusCode: 403, message: "Dean only" })
  }

  return {
    supabase,
    userId: user.id,
    departmentId: user.department_id
  }
}
