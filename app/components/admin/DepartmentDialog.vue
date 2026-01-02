<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'
import { logAudit } from '@/utils/auditLogger'

const props = defineProps<{
  modelValue: boolean
  department: any | null
  existingDepartments: any[]
}>()

const emit = defineEmits(['update:modelValue', 'saved'])

const supabase = useSupabase()
const notify = useNotifyStore()

const saving = ref(false)

const form = ref({
  name: '',
  department_type: 'REGULAR'
})

// ================= WATCH =================
watch(
  () => props.department,
  (val) => {
    form.value = val
      ? { name: val.name, department_type: val.department_type }
      : { name: '', department_type: 'REGULAR' }
  },
  { immediate: true }
)

// ================= VALIDATION =================
const validate = () => {
  const name = form.value.name.trim().toLowerCase()

  if (!name) {
    notify.warning('Department name is required')
    return false
  }

  // ❌ Duplicate name
  if (
    props.existingDepartments.some(d =>
      d.name.toLowerCase() === name &&
      d.id !== props.department?.id
    )
  ) {
    notify.warning('Department name already exists')
    return false
  }

  // ❌ Only one GENED
  if (
    form.value.department_type === 'GENED' &&
    props.existingDepartments.some(
      d => d.department_type === 'GENED' && d.id !== props.department?.id
    )
  ) {
    notify.warning('Only one General Education department is allowed')
    return false
  }

  // ❌ Only one PE_NSTP
  if (
    form.value.department_type === 'PE_NSTP' &&
    props.existingDepartments.some(
      d => d.department_type === 'PE_NSTP' && d.id !== props.department?.id
    )
  ) {
    notify.warning('Only one PE & NSTP department is allowed')
    return false
  }

  return true
}

// ================= SAVE =================
const save = async () => {
  if (!validate()) return
  saving.value = true

  try {
    if (props.department) {
      const { error } = await supabase
        .from('departments')
        .update(form.value)
        .eq('id', props.department.id)

      if (error) throw error

      notify.success('Department updated')

      await logAudit({
        action: 'UPDATE',
        entity_type: 'DEPARTMENT',
        entity_id: props.department.id,
      })
    } else {
      const { data, error } = await supabase
        .from('departments')
        .insert(form.value)
        .select('id')
        .single()

      if (error || !data) throw error

      notify.success('Department created')

      await logAudit({
        action: 'CREATE',
        entity_type: 'DEPARTMENT',
        entity_id: data.id,
      })
    }

    emit('saved')
    emit('update:modelValue', false)
  } catch (err: any) {
    notify.error(err.message || 'Save failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog
    max-width="480"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-4">
        {{ department ? 'Edit Department' : 'Add Department' }}
      </h3>

      <v-text-field
        label="Department Name"
        v-model="form.name"
        variant="outlined"
        required
        class="mb-4"
      />

      <v-select
        label="Department Type"
        v-model="form.department_type"
        variant="outlined"
        :items="[
          { title: 'Regular', value: 'REGULAR' },
          { title: 'General Education', value: 'GENED' },
          { title: 'PE & NSTP', value: 'PE_NSTP' }
        ]"
      />

      <div class="d-flex justify-end mt-6">
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          class="ml-2"
          :loading="saving"
          :disabled="saving"
          @click="save"
        >
          Save
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
