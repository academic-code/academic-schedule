import type { SupabaseClient } from '@supabase/supabase-js'

export async function emitNotifications(
  supabase: SupabaseClient,
  schedule: any
) {
  // only publish creates notifications (optional)
  if (schedule.status !== 'PUBLISHED') return
  if (!schedule.faculty_id) return

  const { data: faculty } = await supabase
    .from('faculty')
    .select('user_id')
    .eq('id', schedule.faculty_id)
    .single()

  if (!faculty?.user_id) return

  await supabase.from('notifications').insert({
    user_id: faculty.user_id,
    type: 'SCHEDULE',
    title: 'Schedule Published',
    message: 'A schedule has been assigned to you',
    entity_type: 'SCHEDULE',
    entity_id: schedule.id
  })
}