import { H3Event, getHeader, createError } from "h3"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

export interface ScheduleAuthContext {
  supabase: SupabaseClient
  userId: string
  role: "ADMIN" | "DEAN"
  departmentId: string
}

export function assertDepartment(
  role: "ADMIN" | "DEAN",
  authDeptId: string,
  targetDeptId: string
) {
  if (role === "DEAN" && authDeptId !== targetDeptId) {
    throw createError({ statusCode: 403, message: "Cross-department denied" })
  }
}


export async function requireScheduleAuthority(
  event: H3Event
): Promise<ScheduleAuthContext> {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const auth = getHeader(event, "authorization")
  if (!auth) throw createError({ statusCode: 401, message: "Missing token" })

  const token = auth.replace("Bearer ", "")
  const { data } = await supabase.auth.getUser(token)

  if (!data?.user) throw createError({ statusCode: 401 })

  const { data: user } = await supabase
    .from("users")
    .select("id, role, department_id")
    .eq("id", data.user.id)
    .single()

  if (!user || !["ADMIN", "DEAN"].includes(user.role)) {
    throw createError({ statusCode: 403, message: "Admin or Dean only" })
  }

  return {
    supabase,
    userId: user.id,
    role: user.role,
    departmentId: user.department_id
  }
}
