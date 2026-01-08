import { defineEventHandler } from "h3"
import { requireDeanWithSupabase } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId } = await requireDeanWithSupabase(event)

  const { data, error } = await supabase
    .from("faculty")
    .select(`
      id,
      first_name,
      last_name,
      middle_name,
      faculty_type,
      is_active,
      created_at,
      users:users!faculty_user_id_fkey (
        email
      )
    `)
    .eq("department_id", departmentId)
    .order("last_name")

  if (error) throw error

 return (data ?? []).map((f: any) => ({
  id: f.id,
  first_name: f.first_name,
  last_name: f.last_name,
  middle_name: f.middle_name,
  faculty_type: f.faculty_type,
  is_active: f.is_active,
  email: f.users?.email ?? "",   // ✅ FIX
  created_at: f.created_at
}))

})
