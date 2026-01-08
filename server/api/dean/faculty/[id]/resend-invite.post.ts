import { defineEventHandler, createError } from "h3"
import { requireDeanWithSupabase } from "../_helpers"

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const SITE_URL = config.public.SITE_URL

  const { supabase } = await requireDeanWithSupabase(event)
  const facultyId = event.context.params?.id

  if (!facultyId) {
    throw createError({
      statusCode: 400,
      message: "Missing faculty id"
    })
  }

  // 1️⃣ Get faculty record (NO JOIN)
  const { data: faculty, error: facultyErr } = await supabase
    .from("faculty")
    .select("id, user_id")
    .eq("id", facultyId)
    .single()

  if (facultyErr || !faculty?.user_id) {
    throw createError({
      statusCode: 404,
      message: "Faculty not found"
    })
  }

  // 2️⃣ Get user email directly
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("email, last_login_at")
    .eq("id", faculty.user_id)
    .single()

  if (userErr || !user?.email) {
    throw createError({
      statusCode: 404,
      message: "Faculty email not found"
    })
  }

  // 3️⃣ Block resend if already activated
  if (user.last_login_at) {
    throw createError({
      statusCode: 409,
      message: "Faculty already activated"
    })
  }

  // 4️⃣ Resend invite
  const { error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(user.email, {
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
