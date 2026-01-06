import { defineEventHandler } from "h3"
import { requireDean } from "./_helpers"

export default defineEventHandler(async (event) => {
  const { supabase, departmentId } = await requireDean(event)

  const { data } = await supabase
    .from("curriculums")
    .select("*")
    .eq("department_id", departmentId)
    .order("effective_year", { ascending: false })

  return data ?? []
})
