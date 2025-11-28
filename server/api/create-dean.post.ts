import { defineEventHandler, readBody } from "h3";
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, full_name, department_id } = body;

  if (!email || !full_name || !department_id) {
    return { error: "Missing required fields" };
  }

  /* -----------------------------------------------------
    1. Admin Supabase client (service role)
  ----------------------------------------------------- */
  const supabase = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  /* -----------------------------------------------------
    2. Check if email already exists
  ----------------------------------------------------- */
  const { data: userList, error: listErr } =
    await supabase.auth.admin.listUsers();

  if (listErr) return { error: listErr.message };

  if (userList.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
    return { error: "Email already exists." };
  }

  /* -----------------------------------------------------
    3. Build redirect URL to welcome page
  ----------------------------------------------------- */
  const redirectUrl =
    `${process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000"}/welcome`;

  /* -----------------------------------------------------
    4. Create auth user + send invite
       IMPORTANT:
       metadata MUST be inside "data"
       Supabase turns it into user_metadata
  ----------------------------------------------------- */
  const { data: inviteData, error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectUrl,
      data: {
        role: "DEAN",
        department_id: department_id, // required for RLS
      },
    });

  if (inviteErr) return { error: `Invite failed: ${inviteErr.message}` };

  const auth_user_id = inviteData?.user?.id;

  if (!auth_user_id) {
    return { error: "Could not create auth user." };
  }

  /* -----------------------------------------------------
    5. Insert into users table
  ----------------------------------------------------- */
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .insert({
      email,
      full_name,
      role: "DEAN",
      auth_user_id,
      department_id, // NEW: important for your RLS & dashboard
    })
    .select()
    .single();

  if (userErr) return { error: userErr.message };

  /* -----------------------------------------------------
    6. Insert dean row
  ----------------------------------------------------- */
  const { error: deanErr } = await supabase.from("deans").insert({
    user_id: userRow.id,
    department_id,
  });

  if (deanErr) return { error: deanErr.message };

  /* -----------------------------------------------------
    ✔ Success
  ----------------------------------------------------- */
  return {
    success: true,
    message: "Dean created and invitation email sent.",
  };
});
