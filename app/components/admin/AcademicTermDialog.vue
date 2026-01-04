<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

const props = defineProps<{
  modelValue: boolean
  suggested?: {
    academic_year: string
    semester: number
  } | null
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const supabase = useSupabase()
const notify = useNotifyStore()

const academicYear = ref('')
const semester = ref<number | null>(null)
const loading = ref(false)

// ================= PREFILL / RESET =================
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return

    if (props.suggested) {
      academicYear.value = props.suggested.academic_year
      semester.value = props.suggested.semester
    } else {
      academicYear.value = ''
      semester.value = null
    }
  }
)

const close = () => {
  academicYear.value = ''
  semester.value = null
  emit('update:modelValue', false)
}

// ================= SUBMIT =================
const submit = async () => {
  if (!academicYear.value || !semester.value) {
    notify.warning('All fields are required')
    return
  }

  loading.value = true
  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/academic-terms/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: {
        academic_year: academicYear.value,
        semester: semester.value
      }
    })

    notify.success('Academic term created')
    emit('success')
    close()
  } catch (err: any) {
    notify.error(err?.data?.message || 'Failed to create academic term')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520">
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">Add Academic Term</h3>

      <v-text-field
        v-model="academicYear"
        label="Academic Year (e.g. 2025-2026)"
        variant="outlined"
      />

      <v-select
        v-model="semester"
        label="Semester"
        variant="outlined"
        :items="[
          { title: '1st Semester', value: 1 },
          { title: '2nd Semester', value: 2 },
          { title: 'Summer', value: 3 }
        ]"
      />

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="submit">
          Create
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
