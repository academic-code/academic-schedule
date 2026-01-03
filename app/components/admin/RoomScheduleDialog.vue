<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

const props = defineProps<{
  modelValue: boolean
  roomId: string | null
}>()

const emit = defineEmits(['update:modelValue'])

const supabase = useSupabase()
const notify = useNotifyStore()

const loading = ref(false)
const schedules = ref<any[]>([])

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.roomId) return

    loading.value = true
    const { data: { session } } = await supabase.auth.getSession()

    try {
      const res = await $fetch<{ data: any[] }>('/api/admin/room-schedules', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        query: {
          room_id: props.roomId
        }
      })

      schedules.value = res.data || []
    } catch (err: any) {
      notify.error(err?.data?.message || 'Failed to load schedules')
    } finally {
      loading.value = false
    }
  }
)
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="900">
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
          </tr>
        </template>

        <template #item="{ item }">
          <tr>
            <td>{{ item.day }}</td>
            <td>
              {{ item.period_start.start_time }} –
              {{ item.period_end.end_time }}
            </td>
            <td>{{ item.classes?.class_name }}</td>
            <td>{{ item.subjects?.name }}</td>
            <td>
              {{ item.faculty?.last_name }},
              {{ item.faculty?.first_name }}
            </td>
          </tr>
        </template>

        <template #no-data>
          <div class="text-center pa-6 text-medium-emphasis">
            No schedules use this room
          </div>
        </template>
      </v-data-table>

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" @click="emit('update:modelValue', false)">
          Close
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
