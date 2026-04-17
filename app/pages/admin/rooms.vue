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

type RoomRow = {
  id: string
  name: string
  room_type: 'LECTURE' | 'LAB' | 'ONLINE'
  capacity: number | null
  is_active: boolean
  created_at: string
}

const supabase = useSupabase()
const notify = useNotifyStore()

const rooms = ref<RoomRow[]>([])
const loading = ref(false)
const actionLoading = ref(false)
const search = ref('')

const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const confirmDelete = ref(false)
const viewSchedulesOpen = ref(false)

const editingRow = ref<RoomRow | null>(null)
const deletingRow = ref<RoomRow | null>(null)
const viewingRoomId = ref<string | null>(null)

const fetchRooms = async () => {
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    rooms.value = (data ?? []) as RoomRow[]
  } catch (err: any) {
    notify.error(err?.message || 'Failed to load rooms')
  } finally {
    loading.value = false
  }
}

const filteredRooms = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rooms.value

  return rooms.value.filter((room) =>
    room.name.toLowerCase().includes(q)
  )
})

const openCreate = () => {
  editingRow.value = null
  createDialogOpen.value = true
}

const openEdit = (row: RoomRow) => {
  editingRow.value = row
  editDialogOpen.value = true
}

const openViewSchedules = (row: RoomRow) => {
  viewingRoomId.value = row.id
  viewSchedulesOpen.value = true
}

const closeDeleteDialog = () => {
  if (actionLoading.value) return
  confirmDelete.value = false
  deletingRow.value = null
}

const requestDelete = (row: RoomRow) => {
  deletingRow.value = row
  confirmDelete.value = true
}

const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    throw new Error('No active session')
  }

  return token
}

const executeDelete = async () => {
  if (!deletingRow.value) return

  actionLoading.value = true

  try {
    const token = await getAccessToken()

    await $fetch('/api/admin/delete-room', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        id: deletingRow.value.id
      }
    })

    notify.success('Room deleted')
    await fetchRooms()
  } catch (err: any) {
    notify.error(
      err?.data?.message ||
      err?.message ||
      'Cannot delete room. This room is already used in schedules.'
    )
  } finally {
    actionLoading.value = false
    closeDeleteDialog()
  }
}

const toggleStatus = async (row: RoomRow) => {
  actionLoading.value = true

  try {
    const token = await getAccessToken()

    await $fetch('/api/admin/toggle-room-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        id: row.id,
        is_active: !row.is_active
      }
    })

    notify.success('Room status updated')
    await fetchRooms()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'Status update failed')
  } finally {
    actionLoading.value = false
  }
}

let channel: any

const setupRealtime = () => {
  channel = supabase
    .channel('rooms-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms' },
      () => {
        fetchRooms()
      }
    )
    .subscribe()
}

onMounted(async () => {
  await fetchRooms()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (channel) {
    supabase.removeChannel(channel)
  }
})
</script>

<template>
  <div>
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

    <v-text-field
      v-model="search"
      label="Search room"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      clearable
      class="mb-4"
    />

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
              <v-chip size="small" :color="item.is_active ? 'green' : 'grey'">
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </td>

            <td class="text-center">
              <v-btn
                icon
                size="small"
                variant="text"
                color="info"
                :disabled="actionLoading"
                @click="openViewSchedules(item)"
              >
                <v-icon size="18">mdi-eye</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                :disabled="actionLoading"
                @click="openEdit(item)"
              >
                <v-icon size="18">mdi-pencil</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                :disabled="actionLoading"
                :color="item.is_active ? 'warning' : 'green'"
                @click="toggleStatus(item)"
              >
                <v-icon size="18">
                  {{ item.is_active ? 'mdi-eye-off' : 'mdi-eye' }}
                </v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                color="error"
                :disabled="actionLoading"
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

    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card class="pa-6">
        <h3 class="mb-3">Delete Room</h3>
        <p>
          This room will be permanently removed.
          <br />
          <strong>Deletion is blocked if the room is used in schedules.</strong>
        </p>

        <div class="d-flex justify-end">
          <v-btn variant="text" :disabled="actionLoading" @click="closeDeleteDialog">
            Cancel
          </v-btn>
          <v-btn color="error" :loading="actionLoading" :disabled="actionLoading" @click="executeDelete">
            Delete
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <RoomDialog
      v-model="createDialogOpen"
      @success="fetchRooms"
    />

    <RoomDialog
      v-model="editDialogOpen"
      :editData="editingRow"
      @success="fetchRooms"
    />

    <RoomScheduleDialog
      v-model="viewSchedulesOpen"
      :roomId="viewingRoomId"
    />
  </div>
</template>