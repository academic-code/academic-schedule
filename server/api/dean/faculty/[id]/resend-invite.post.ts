import { defineEventHandler, createError } from "h3"
import { requireDeanWithSupabase } from "../_helpers"

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const SITE_URL = config.public.SITE_URL

  const { supabase } = await requireDeanWithSupabase(event)
  const facultyId = event.context.params?.id

  if (!facultyId) {
    throw createError({ statusCode: 400, message: "Missing faculty id" })
  }

  const { data: faculty, error } = await supabase
    .from("faculty")
    .select(`
      id,
      users:users!faculty_user_id_fkey (
        email
      )
    `)
    .eq("id", facultyId)
    .single()

  if (error || !faculty) {
    throw createError({ statusCode: 404, message: "Faculty not found" })
  }

  const email = Array.isArray(faculty.users)
    ? faculty.users[0]?.email
    : null

  if (!email) {
    throw createError({
      statusCode: 404,
      message: "Faculty email not found"
    })
  }

  const { error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${SITE_URL}/auth/set-password`
    })

  if (inviteErr) {
    throw createError({
      statusCode: 500,
      message: inviteErr.message
    })
  }

  return { success: true }
})
