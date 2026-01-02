import { useSupabase } from '@/composables/useSupabase'

export const logAudit = async (payload: {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'ARCHIVE' | 'SIMULATE'
  entity_type: string
  entity_id?: string
  old_value?: any
  new_value?: any
}) => {
  try {
    const supabase = useSupabase()

    const { error } = await supabase.from('audit_logs').insert({
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id ?? null,
      old_value: payload.old_value ?? null,
      new_value: payload.new_value ?? null
    })

    if (error) {
      console.warn('Audit log failed:', error.message)
    }
  } catch (err) {
    console.warn('Audit logger exception:', err)
  }
}
