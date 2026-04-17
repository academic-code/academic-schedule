import { createError, getQuery, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

type ScheduleRow = {
  id: string
  day: string
  mode: string
  status: string
  classes: {
    program: string | null
    year_level: number | null
    section: string | null
  } | null
  subjects: {
    course_code: string | null
    description: string | null
  } | null
  faculty: {
    last_name: string | null
    first_name: string | null
  } | null
  start_period: {
    start_time: string | null
    end_time: string | null
    slot_index: number | null
  } | null
  end_period: {
    start_time: string | null
    end_time: string | null
    slot_index: number | null
  } | null
}

const dayOrder: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7
}

const yearLabel = (year: number | null | undefined) => {
  if (!year) return ''
  if (year === 1) return '1st Year'
  if (year === 2) return '2nd Year'
  if (year === 3) return '3rd Year'
  return `${year}th Year`
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const SUPABASE_URL =
    (config.SUPABASE_URL as string | undefined) ||
    (config.public.SUPABASE_URL as string | undefined)

  const SERVICE_ROLE_KEY = config.SUPABASE_SERVICE_ROLE_KEY as string | undefined
  const PUBLIC_URL = config.public.SUPABASE_URL as string | undefined
  const PUBLIC_KEY = config.public.SUPABASE_ANON_KEY as string | undefined

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUBLIC_URL || !PUBLIC_KEY) {
    throw createError({ statusCode: 500, message: 'Server configuration is incomplete' })
  }

  const serverUrl = SUPABASE_URL!
  const serviceRoleKey = SERVICE_ROLE_KEY!
  const publicUrl = PUBLIC_URL!
  const publicKey = PUBLIC_KEY!

  const supabaseAdmin = createClient(serverUrl, serviceRoleKey)

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) {
    throw createError({ statusCode: 401, message: 'Missing auth header' })
  }

  const supabaseUser = createClient(publicUrl, publicKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  })

  const {
    data: { user: authUser },
    error: authError
  } = await supabaseUser.auth.getUser()

  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data: adminRow, error: adminError } = await supabaseUser
    .from('users')
    .select('id, role')
    .eq('id', authUser.id)
    .single()

  if (adminError || !adminRow || adminRow.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const roomId = query.room_id as string | undefined

  if (!roomId) {
    throw createError({ statusCode: 400, message: 'room_id is required' })
  }

  const { data, error } = await supabaseAdmin
    .from('schedules')
    .select(`
      id,
      day,
      mode,
      status,
      classes (
        program,
        year_level,
        section
      ),
      subjects (
        course_code,
        description
      ),
      faculty (
        last_name,
        first_name
      ),
      start_period:periods!schedules_start_period_id_fkey (
        start_time,
        end_time,
        slot_index
      ),
      end_period:periods!schedules_end_period_id_fkey (
        start_time,
        end_time,
        slot_index
      )
    `)
    .eq('room_id', roomId)

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  const normalized = ((data ?? []) as unknown as ScheduleRow[])
    .map((item) => {
      const class_name = item.classes
        ? [
            item.classes.program ?? '',
            yearLabel(item.classes.year_level),
            item.classes.section ?? ''
          ].filter(Boolean).join(' ')
        : '—'

      const subject_name = item.subjects
        ? [item.subjects.course_code, item.subjects.description]
            .filter(Boolean)
            .join(' - ')
        : '—'

      const faculty_name = item.faculty
        ? [item.faculty.last_name, item.faculty.first_name]
            .filter(Boolean)
            .join(', ')
        : '—'

      const start = item.start_period?.start_time ?? ''
      const end = item.end_period?.end_time ?? ''
      const time_range = start && end ? `${start} – ${end}` : '—'

      return {
        id: item.id,
        day: item.day,
        mode: item.mode,
        status: item.status,
        class_name,
        subject_name,
        faculty_name,
        time_range,
        sort_day: dayOrder[item.day] ?? 99,
        sort_slot: item.start_period?.slot_index ?? 999
      }
    })
    .sort((a, b) => {
      if (a.sort_day !== b.sort_day) return a.sort_day - b.sort_day
      return a.sort_slot - b.sort_slot
    })
    .map(({ sort_day, sort_slot, ...row }) => row)

  return { data: normalized }
})