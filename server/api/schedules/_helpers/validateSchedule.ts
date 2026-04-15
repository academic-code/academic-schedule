import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SchedulePayload } from './types'

export async function validateSchedule(
  supabase: SupabaseClient,
  payload: SchedulePayload,
  auth: { departmentId: string; departmentType: 'REGULAR'|'GENED'|'PE_NSTP' }
) {
  // Period range
  if (payload.start_period_id === payload.end_period_id) {
    throw createError({ statusCode: 400, message: 'Start and end period cannot be the same' })
  }

  // Term must be active + unlocked
  const { data: term } = await supabase
    .from('academic_terms')
    .select('is_active, is_locked, semester')
    .eq('id', payload.academic_term_id)
    .single()

  if (!term || !term.is_active || term.is_locked) {
    throw createError({ statusCode: 403, message: 'Academic term is invalid or locked' })
  }

  // Subject must exist + not locked + semester match
  const { data: subject } = await supabase
    .from('subjects')
    .select('subject_type, is_locked, semester')
    .eq('id', payload.subject_id)
    .single()

  if (!subject || subject.is_locked) {
    throw createError({ statusCode: 400, message: 'Invalid or locked subject' })
  }

  if (subject.semester !== term.semester) {
    throw createError({ statusCode: 400, message: 'Subject semester does not match academic term' })
  }

  // Subject type authority by OWNER department type
  // (GenEd can only schedule GENED subjects, PE can only schedule PE_NSTP, Regular can only schedule MAJOR)
  const expectedType =
    auth.departmentType === 'REGULAR' ? 'MAJOR'
    : auth.departmentType === 'GENED' ? 'GENED'
    : 'PE_NSTP'

  if (subject.subject_type !== expectedType) {
    throw createError({
      statusCode: 403,
      message: `You can only schedule ${expectedType} subjects`
    })
  }

  // Faculty optional (allowed), but if present must be active
  if (payload.faculty_id) {
    const { data: fac } = await supabase
      .from('faculty')
      .select('is_active')
      .eq('id', payload.faculty_id)
      .single()

    if (!fac || !fac.is_active) {
      throw createError({ statusCode: 400, message: 'Invalid or inactive faculty' })
    }
  }

  // Class rules:
  // - Regular: class_id required
  // - GenEd/PE: class_id required (they are attaching to a target class schedule)
  if (!payload.class_id) {
    throw createError({ statusCode: 400, message: 'class_id is required' })
  }

  const { data: cls } = await supabase
    .from('classes')
    .select('id, department_id')
    .eq('id', payload.class_id)
    .single()

  if (!cls) throw createError({ statusCode: 400, message: 'Invalid class' })

  // target_department_id must match class.department_id
  if (payload.target_department_id !== cls.department_id) {
    throw createError({
      statusCode: 400,
      message: 'target_department_id must match class department'
    })
  }

  // Room rules (OPTIONAL):
  // - If room_id is null: allowed only for F2F (per your rule)
  // - If mode is ONLINE/ASYNC: room must be ONLINE room
  if (!payload.room_id) {
    if (payload.mode !== 'F2F') {
      throw createError({
        statusCode: 400,
        message: 'ONLINE/ASYNC requires an ONLINE room'
      })
    }
  } else {
    const { data: room } = await supabase
      .from('rooms')
      .select('is_active, room_type')
      .eq('id', payload.room_id)
      .single()

    if (!room || !room.is_active) {
      throw createError({ statusCode: 400, message: 'Invalid or inactive room' })
    }

    if ((payload.mode === 'ONLINE' || payload.mode === 'ASYNC') && room.room_type !== 'ONLINE') {
      throw createError({ statusCode: 400, message: 'ONLINE/ASYNC requires ONLINE room' })
    }

    if (payload.mode === 'F2F' && room.room_type === 'ONLINE') {
      throw createError({ statusCode: 400, message: 'F2F cannot use ONLINE room' })
    }
  }
}