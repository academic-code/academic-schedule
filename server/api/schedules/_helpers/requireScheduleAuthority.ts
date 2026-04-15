import { H3Event, getHeader, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import type { ScheduleAuthContext } from './types'

export function assertDeptWrite(authDeptId: string, ownerDeptId: string) {
  // owner-only writes
  if (authDeptId !== ownerDeptId) {
    throw createError({ statusCode: 403, message: 'Owner department only' })
  }
}

export async function requireScheduleAuthority(event: H3Event): Promise<ScheduleAuthContext> {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const auth = getHeader(event, 'authorization')
  if (!auth) throw createError({ statusCode: 401, message: 'Missing token' })

  const token = auth.replace('Bearer ', '').trim()
  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { data: userRow } = await supabase
    .from('users')
    .select('id, role, department_id, is_active')
    .eq('id', authData.user.id)
    .single()

  if (!userRow || !userRow.is_active) {
    throw createError({ statusCode: 403, message: 'Account inactive' })
  }

  if (!['ADMIN', 'DEAN'].includes(userRow.role)) {
    throw createError({ statusCode: 403, message: 'Admin or Dean only' })
  }

  const { data: dept } = await supabase
    .from('departments')
    .select('department_type')
    .eq('id', userRow.department_id)
    .single()

  if (!dept) throw createError({ statusCode: 400, message: 'Department not found' })

  return {
    supabase,
    userId: userRow.id,
    role: userRow.role,
    departmentId: userRow.department_id,
    departmentType: dept.department_type
  }
}