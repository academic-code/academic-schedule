import { defineEventHandler, readBody, createError } from "h3"
import {
  requireDeanWithSupabase,
  assertAcademicTermUnlocked
} from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, userId, departmentId } =
    await requireDeanWithSupabase(event)

  await assertAcademicTermUnlocked(supabase)

  const {
    email,
    first_name,
    last_name,
    middle_name,
    faculty_type
  } = await readBody(event)

  if (!email || !first_name || !last_name || !faculty_type) {
    throw createError({
      statusCode: 400,
      message: "Missing required fields"
    })
  }

  if (!["FULL_TIME", "PART_TIME"].includes(faculty_type)) {
    throw createError({
      statusCode: 400,
      message: "Invalid faculty type"
    })
  }

  // 🔒 DUPLICATE EMAIL GUARD
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: "Faculty with this email already exists"
    })
  }

  // 1️⃣ Invite auth user
  const { data: invite, error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(email)

  if (inviteErr || !invite.user?.id) {
    throw createError({
      statusCode: 409,
      message: inviteErr?.message || "Failed to invite user"
    })
  }

  const authUserId = invite.user.id

  // 2️⃣ Insert users row
  await supabase.from("users").insert({
    id: authUserId,
    email,
    role: "FACULTY",
    department_id: departmentId,
    is_active: true
  })

  // 3️⃣ Insert faculty row
  const { data: faculty, error } = await supabase
    .from("faculty")
    .insert({
      user_id: authUserId,
      department_id: departmentId,
      first_name,
      last_name,
      middle_name: middle_name ?? null,
      faculty_type
    })
    .select()
    .single()

  if (error) throw error

  // 4️⃣ Audit
  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "CREATE",
    entity_type: "FACULTY",
    entity_id: faculty.id,
    new_value: faculty
  })

  return faculty
})
