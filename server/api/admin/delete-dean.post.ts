import { readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const SUPABASE_URL = config.SUPABASE_URL as string
  const SERVICE_ROLE_KEY = config.SUPABASE_SERVICE_ROLE_KEY as string
  const PUBLIC_URL = config.public.SUPABASE_URL as string
  const PUBLIC_KEY = config.public.SUPABASE_ANON_KEY as string

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUBLIC_URL || !PUBLIC_KEY) {
    throw createError({ statusCode: 500, message: 'Server configuration missing' })
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // ================= AUTH CHECK =================
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) {
    throw createError({ statusCode: 401, message: 'Missing auth header' })
  }

  const supabaseUser = createClient(PUBLIC_URL, PUBLIC_KEY, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: authData } = await supabaseUser.auth.getUser()
  const adminUser = authData?.user
  if (!adminUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data: adminRow } = await supabaseUser
    .from('users')
    .select('role')
    .eq('id', adminUser.id)
    .single()

  if (adminRow?.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ================= INPUT =================
  const body = await readBody(event)
  const deanUserId = body?.user_id as string

  if (!deanUserId) {
    throw createError({ statusCode: 400, message: 'Dean user_id is required' })
  }

  // ================= LOAD DEAN =================
  const { data: dean } = await supabaseAdmin
    .from('deans')
    .select('id, user_id, department_id')
    .eq('user_id', deanUserId)
    .single()

  if (!dean) {
    throw createError({ statusCode: 404, message: 'Dean record not found' })
  }

  const departmentId = dean.department_id

  // ================= CASCADE DELETE =================

  // 1️⃣ schedules → schedule_periods (via FK)
  await supabaseAdmin
    .from('schedules')
    .delete()
    .eq('department_id', departmentId)

  // 2️⃣ classes
  await supabaseAdmin
    .from('classes')
    .delete()
    .eq('department_id', departmentId)

  // 3️⃣ subjects
  await supabaseAdmin
    .from('subjects')
    .delete()
    .eq('department_id', departmentId)

  // 4️⃣ faculty
  await supabaseAdmin
    .from('faculty')
    .delete()
    .eq('department_id', departmentId)

  // 5️⃣ dean row
  await supabaseAdmin
    .from('deans')
    .delete()
    .eq('user_id', deanUserId)

  // 6️⃣ user profile
  await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', deanUserId)

  // 7️⃣ auth user (safe)
  const { data: authDean } =
    await supabaseAdmin.auth.admin.getUserById(deanUserId)

  if (authDean?.user) {
    await supabaseAdmin.auth.admin.deleteUser(deanUserId)
  }

  // ================= AUDIT LOG =================
  await supabaseAdmin.from('audit_logs').insert({
    user_id: adminUser.id,
    action: 'DELETE',
    entity_type: 'DEAN',
    entity_id: deanUserId,
    old_value: {
      dean_user_id: deanUserId,
      department_id: departmentId
    },
    new_value: null
  })

  return { success: true }
})
