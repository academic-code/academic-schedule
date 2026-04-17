<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

type SuggestedTerm = {
  academic_year: string
  semester: number
}

const props = defineProps<{
  modelValue: boolean
  suggested?: SuggestedTerm | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const supabase = useSupabase()
const notify = useNotifyStore()

const academicYear = ref('')
const semester = ref<number | null>(null)
const loading = ref(false)

const resetForm = () => {
  academicYear.value = ''
  semester.value = null
}

watch(
  () => [props.modelValue, props.suggested] as const,
  ([open]) => {
    if (!open) {
      resetForm()
      return
    }

    if (props.suggested) {
      academicYear.value = props.suggested.academic_year
      semester.value = props.suggested.semester
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

const close = () => {
  if (loading.value) return
  resetForm()
  emit('update:modelValue', false)
}

const submit = async () => {
  if (!academicYear.value.trim() || !semester.value) {
    notify.warning('All fields are required')
    return
  }

  loading.value = true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      throw new Error('No active session')
    }

    await $fetch('/api/admin/academic-terms/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        academic_year: academicYear.value.trim(),
        semester: semester.value
      }
    })

    notify.success('Academic term created')
    resetForm()
    emit('update:modelValue', false)
    emit('success')
  } catch (err: any) {
    notify.error(
      err?.data?.message ||
      err?.message ||
      'Failed to create academic term'
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">Add Academic Term</h3>

      <v-text-field
        v-model="academicYear"
        label="Academic Year (e.g. 2025-2026)"
        variant="outlined"
        class="mb-2"
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
        <v-btn variant="text" :disabled="loading" @click="close">
          Cancel
        </v-btn>

        <v-btn color="primary" :loading="loading" :disabled="loading" @click="submit">
          Create
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>