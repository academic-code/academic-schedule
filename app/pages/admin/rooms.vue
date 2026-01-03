<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

import RoomDialog from '@/components/admin/RoomDialog.vue'
import RoomScheduleDialog from '@/components/admin/RoomScheduleDialog.vue'

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

const supabase = useSupabase()
const notify = useNotifyStore()

// ================= STATE =================
const rooms = ref<any[]>([])
const loading = ref(false)
const search = ref('')

// dialogs
const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const confirmDelete = ref(false)
const viewSchedulesOpen = ref(false)

// selection
const editingRow = ref<any | null>(null)
const deletingRow = ref<any | null>(null)
const viewingRoomId = ref<string | null>(null)

// ================= FETCH =================
const fetchRooms = async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    notify.error(error.message || 'Failed to load rooms')
  } else {
    rooms.value = data ?? []
  }

  loading.value = false
}

// ================= SEARCH =================
const filteredRooms = computed(() => {
  if (!search.value) return rooms.value
  const q = search.value.toLowerCase()

  return rooms.value.filter((r) =>
    r.name.toLowerCase().includes(q)
  )
})

// ================= CREATE =================
const openCreate = () => {
  editingRow.value = null
  createDialogOpen.value = true
}

// ================= EDIT =================
const openEdit = (row: any) => {
  editingRow.value = row
  editDialogOpen.value = true
}

// ================= VIEW SCHEDULES =================
const openViewSchedules = (row: any) => {
  viewingRoomId.value = row.id
  viewSchedulesOpen.value = true
}

// ================= DELETE =================
const requestDelete = (row: any) => {
  deletingRow.value = row
  confirmDelete.value = true
}

const executeDelete = async () => {
  if (!deletingRow.value) return

  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/delete-room', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      },
      body: {
        id: deletingRow.value.id
      }
    })

    notify.success('Room deleted')
    fetchRooms()
  } catch (err: any) {
    notify.error(err?.data?.message || 'Room is currently in use')
  } finally {
    confirmDelete.value = false
    deletingRow.value = null
  }
}

// ================= TOGGLE ACTIVE =================
const toggleStatus = async (row: any) => {
  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/toggle-room-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      },
      body: {
        id: row.id,
        is_active: !row.is_active
      }
    })

    notify.success('Room status updated')
    fetchRooms()
  } catch (err: any) {
    notify.error(err?.data?.message || 'Status update failed')
  }
}

// ================= REALTIME =================
let channel: any

const setupRealtime = () => {
  channel = supabase
    .channel('rooms-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms' },
      fetchRooms
    )
    .subscribe()
}

onMounted(() => {
  fetchRooms()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
})
</script>

<template>
  <div>
    <!-- HEADER -->
    <div class="mb-6 d-flex justify-space-between align-center">
      <div>
        <h1 class="text-h5 font-weight-bold">Rooms</h1>
        <p class="text-body-2 text-medium-emphasis">
          Manage classrooms and facilities
        </p>
      </div>

      <v-btn color="primary" @click="openCreate">
        Add Room
      </v-btn>
    </div>

    <!-- SEARCH -->
    <v-text-field
      v-model="search"
      label="Search room"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      clearable
      class="mb-4"
    />

    <!-- TABLE -->
    <v-card>
      <v-data-table
        :items="filteredRooms"
        :loading="loading"
        item-key="id"
      >
        <template #headers>
          <tr>
            <th>Room</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Status</th>
            <th class="text-center" width="220">Actions</th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr>
            <td><strong>{{ item.name }}</strong></td>
            <td>{{ item.room_type }}</td>
            <td>{{ item.capacity ?? '—' }}</td>

            <td>
              <v-chip
                size="small"
                :color="item.is_active ? 'green' : 'grey'"
              >
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </td>

            <td class="text-center">
              <!-- VIEW SCHEDULES -->
              <v-btn
                icon
                size="small"
                variant="text"
                color="info"
                @click="openViewSchedules(item)"
              >
                <v-icon size="18">mdi-eye</v-icon>
              </v-btn>

              <!-- EDIT -->
              <v-btn
                icon
                size="small"
                variant="text"
                @click="openEdit(item)"
              >
                <v-icon size="18">mdi-pencil</v-icon>
              </v-btn>

              <!-- TOGGLE -->
              <v-btn
                icon
                size="small"
                variant="text"
                :color="item.is_active ? 'warning' : 'green'"
                @click="toggleStatus(item)"
              >
                <v-icon size="18">
                  {{ item.is_active ? 'mdi-eye-off' : 'mdi-eye' }}
                </v-icon>
              </v-btn>

              <!-- DELETE -->
              <v-btn
                icon
                size="small"
                variant="text"
                color="error"
                @click="requestDelete(item)"
              >
                <v-icon size="18">mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>

        <template #no-data>
          <div class="pa-6 text-center text-medium-emphasis">
            No rooms found
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- DELETE CONFIRM -->
    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card class="pa-6">
        <h3 class="mb-3">Delete Room</h3>
        <p>
          This room will be permanently removed.
          <br />
          <strong>Deletion is blocked if the room is used in schedules.</strong>
        </p>

        <div class="d-flex justify-end">
          <v-btn variant="text" @click="confirmDelete = false">
            Cancel
          </v-btn>
          <v-btn color="error" @click="executeDelete">
            Delete
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- CREATE -->
    <RoomDialog
      v-model="createDialogOpen"
      @success="fetchRooms"
    />

    <!-- EDIT -->
    <RoomDialog
      v-model="editDialogOpen"
      :editData="editingRow"
      @success="fetchRooms"
    />

    <!-- VIEW SCHEDULES -->
    <RoomScheduleDialog
      v-model="viewSchedulesOpen"
      :roomId="viewingRoomId"
    />
  </div>
</template>
