import { createError, getQuery, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  // ================= AUTH =================
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) {
    throw createError({ statusCode: 401, message: 'Missing auth header' })
  }

  // ================= PARAMS =================
  const query = getQuery(event)
  const roomId = query.room_id as string

  if (!roomId) {
    throw createError({ statusCode: 400, message: 'room_id is required' })
  }

  // ================= QUERY =================
  const { data, error } = await supabase
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
    .order('day')
    .order('slot_index', { foreignTable: 'start_period' })

  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }

  return data
})
