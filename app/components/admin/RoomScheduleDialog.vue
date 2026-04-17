<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

type RoomScheduleRow = {
  id: string
  day: string
  time_range: string
  class_name: string
  subject_name: string
  faculty_name: string
  mode: string
  status: string
}

const props = defineProps<{
  modelValue: boolean
  roomId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const supabase = useSupabase()
const notify = useNotifyStore()

const loading = ref(false)
const schedules = ref<RoomScheduleRow[]>([])

const close = () => {
  schedules.value = []
  emit('update:modelValue', false)
}

watch(
  () => [props.modelValue, props.roomId] as const,
  async ([open, roomId]) => {
    if (!open || !roomId) {
      schedules.value = []
      return
    }

    loading.value = true

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('No active session')
      }

      const res = await $fetch<{ data: RoomScheduleRow[] }>('/api/admin/room-schedules', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        },
        query: {
          room_id: roomId
        }
      })

      schedules.value = res.data ?? []
    } catch (err: any) {
      notify.error(
        err?.data?.message ||
        err?.message ||
        'Failed to load room schedules'
      )
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">Schedules Using This Room</h3>

      <v-data-table
        :items="schedules"
        :loading="loading"
        density="comfortable"
      >
        <template #headers>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Class</th>
            <th>Subject</th>
            <th>Faculty</th>
            <th>Mode</th>
            <th>Status</th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr>
            <td>{{ item.day }}</td>
            <td>{{ item.time_range }}</td>
            <td>{{ item.class_name }}</td>
            <td>{{ item.subject_name }}</td>
            <td>{{ item.faculty_name }}</td>
            <td>{{ item.mode }}</td>
            <td>{{ item.status }}</td>
          </tr>
        </template>

        <template #no-data>
          <div class="text-center pa-6 text-medium-emphasis">
            No schedules use this room
          </div>
        </template>
      </v-data-table>

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" @click="close">
          Close
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>