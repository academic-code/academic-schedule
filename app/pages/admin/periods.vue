<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'
import PeriodGenerateDialog from '@/components/admin/GeneratePeriodsDialog.vue'
import { to12Hour } from '@/utils/time'

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

const supabase = useSupabase()
const notify = useNotifyStore()

const periods = ref<any[]>([])
const loading = ref(false)
const dialogOpen = ref(false)

const fetchPeriods = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('periods')
    .select('*')
    .order('slot_index')

  if (error) notify.error(error.message)
  else periods.value = data ?? []

  loading.value = false
}

// 🔁 REALTIME (OPTIONAL BUT ENABLED)
let channel: any
const setupRealtime = () => {
  channel = supabase
    .channel('periods-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'periods' },
      fetchPeriods
    )
    .subscribe()
}

onMounted(() => {
  fetchPeriods()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
})
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold">Time Periods</h1>
        <p class="text-body-2 text-medium-emphasis">
          Define scheduling time slots
        </p>
      </div>

      <v-btn color="primary" @click="dialogOpen = true">
        Generate Periods
      </v-btn>
    </div>

    <v-card>
      <v-data-table :items="periods" :loading="loading">
        <template #headers>
          <tr>
            <th>#</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr>
            <td>{{ item.slot_index }}</td>
            <td>{{ to12Hour(item.start_time) }}</td>
            <td>{{ to12Hour(item.end_time) }}</td>
          </tr>
        </template>

        <template #no-data>
          <div class="pa-6 text-center text-medium-emphasis">
            No periods defined
          </div>
        </template>
      </v-data-table>
    </v-card>

    <PeriodGenerateDialog
      v-model="dialogOpen"
      @success="fetchPeriods"
    />
  </div>
</template>
