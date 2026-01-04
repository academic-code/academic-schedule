import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data, error } = await supabase
    .from('periods')
    .select('*')
    .order('slot_index')

  if (error) throw error
  return data
})
