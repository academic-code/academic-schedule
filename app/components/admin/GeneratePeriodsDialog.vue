<script setup lang="ts">
import { ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'success'])

const supabase = useSupabase()
const notify = useNotifyStore()

const startTime = ref('07:00')
const endTime = ref('21:00')
const interval = ref(30)
const loading = ref(false)

const close = () => emit('update:modelValue', false)

const submit = async () => {
  loading.value = true
  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/periods/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      },
      body: {
        start_time: startTime.value,
        end_time: endTime.value,
        interval: interval.value
      }
    })

    notify.success('Periods generated successfully')
    emit('success')
    close()
  } catch (err: any) {
    notify.error(err?.data?.message || 'Failed to generate periods')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520">
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">Generate Time Periods</h3>

      <v-text-field
        v-model="startTime"
        label="Start Time (24h)"
        type="time"
        variant="outlined"
      />

      <v-text-field
        v-model="endTime"
        label="End Time (24h)"
        type="time"
        variant="outlined"
      />

      <v-select
        v-model="interval"
        label="Interval"
        variant="outlined"
        :items="[
          { title: '30 minutes', value: 30 },
          { title: '1 hour', value: 60 }
        ]"
      />

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="submit">
          Generate
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
