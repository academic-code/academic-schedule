<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'
import DeanDialog from '@/components/admin/DeanDialog.vue'

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

const supabase = useSupabase()
const notify = useNotifyStore()

// ================= STATE =================
const deans = ref<any[]>([])
const departments = ref<any[]>([])
const loading = ref(false)
const search = ref('')

// dialogs
const dialogOpen = ref(false)
const editDialogOpen = ref(false)
const confirmDelete = ref(false)

// selection
const deletingRow = ref<any | null>(null)
const editingRow = ref<any | null>(null)

// ================= FETCH =================
const fetchDeans = async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('deans')
    .select(`
      id,
      created_at,
      users (
        id,
        email,
        first_name,
        last_name,
        middle_name,
        is_active
      ),
      departments (
        id,
        name,
        department_type
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    notify.error('Failed to load deans')
  } else {
    deans.value = data ?? []
  }

  loading.value = false
}

const fetchDepartments = async () => {
  const { data } = await supabase
    .from('departments')
    .select('*')
    .order('name')

  departments.value = data ?? []
}

// ================= SEARCH =================
const filteredDeans = computed(() => {
  if (!search.value) return deans.value

  const q = search.value.toLowerCase()

  return deans.value.filter((d) => {
    if (!d.users) return false

    const fullName = `
      ${d.users.last_name ?? ''}
      ${d.users.first_name ?? ''}
      ${d.users.middle_name ?? ''}
    `.toLowerCase()

    return (
      fullName.includes(q) ||
      d.users.email?.toLowerCase().includes(q)
    )
  })
})

// ================= DELETE =================
const requestDelete = (row: any) => {
  deletingRow.value = row
  confirmDelete.value = true
}

const executeDelete = async () => {
  if (!deletingRow.value?.users?.id) {
    notify.error('Invalid dean record')
    confirmDelete.value = false
    return
  }

  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/delete-dean', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      },
      body: {
        user_id: deletingRow.value.users.id
      }
    })

    notify.success('Dean removed successfully')
    fetchDeans()
  } catch (err: any) {
    notify.error(err?.data?.message || 'Failed to delete dean')
  } finally {
    confirmDelete.value = false
    deletingRow.value = null
  }
}

// ================= TOGGLE ACTIVE =================
const toggleStatus = async (row: any) => {
  if (!row?.users?.id) return

  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/toggle-dean-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      },
      body: {
        user_id: row.users.id,
        is_active: !row.users.is_active
      }
    })

    notify.success('Dean status updated')
    fetchDeans()
  } catch (err: any) {
    notify.error(err?.data?.message || 'Failed to update status')
  }
}

// ================= RESEND INVITE =================
const resendInvite = async (row: any) => {
  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/resend-dean-invite', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      },
      body: {
        email: row.users.email
      }
    })

    notify.success('Invitation email resent')
  } catch (err: any) {
    notify.error(err?.data?.message || 'Failed to resend invite')
  }
}

// ================= EDIT =================
const openEdit = (row: any) => {
  editingRow.value = row
  editDialogOpen.value = true
}

// ================= REALTIME =================
let channel: any

const setupRealtime = () => {
  channel = supabase
    .channel('deans-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deans' },
      fetchDeans
    )
    .subscribe()
}

onMounted(async () => {
  await fetchDepartments()
  await fetchDeans()
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
        <h1 class="text-h5 font-weight-bold">Deans</h1>
        <p class="text-body-2 text-medium-emphasis">
          Invite and manage department deans
        </p>
      </div>

      <v-btn color="primary" @click="dialogOpen = true">
        Invite Dean
      </v-btn>
    </div>

    <!-- SEARCH -->
    <v-text-field
      v-model="search"
      label="Search by name or email"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      clearable
      class="mb-4"
    />

    <!-- TABLE -->
    <v-card>
      <v-data-table
        :items="filteredDeans"
        :loading="loading"
        item-key="id"
      >
        <template #headers>
          <tr>
            <th>Dean</th>
            <th>Department</th>
            <th>Status</th>
            <th class="text-center" width="200">Actions</th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr>
            <!-- NAME -->
            <td>
              <strong>
                {{ item.users.last_name }},
                {{ item.users.first_name }}
                <span v-if="item.users.middle_name">
                  {{ item.users.middle_name }}
                </span>
              </strong>
              <div class="text-caption text-medium-emphasis">
                {{ item.users.email }}
              </div>
            </td>

            <!-- DEPARTMENT -->
            <td>
              <v-chip size="small" variant="tonal">
                {{ item.departments.name }}
              </v-chip>
            </td>

            <!-- STATUS -->
            <td>
              <v-chip
                size="small"
                :color="item.users.is_active ? 'green' : 'grey'"
              >
                {{ item.users.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </td>

            <!-- ACTIONS -->
            <td class="text-center">
              <v-btn icon size="small" variant="text" @click="openEdit(item)">
                <v-icon size="18">mdi-pencil</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                :color="item.users.is_active ? 'warning' : 'green'"
                @click="toggleStatus(item)"
              >
                <v-icon size="18">
                  {{ item.users.is_active ? 'mdi-account-off' : 'mdi-account-check' }}
                </v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                color="info"
                @click="resendInvite(item)"
              >
                <v-icon size="18">mdi-email-sync</v-icon>
              </v-btn>

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
            No deans found
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- DELETE CONFIRM -->
    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card class="pa-6">
        <h3 class="mb-3">Remove Dean</h3>
        <p>This will permanently remove the dean account.</p>

        <div class="d-flex justify-end">
          <v-btn variant="text" @click="confirmDelete = false">Cancel</v-btn>
          <v-btn color="error" @click="executeDelete">Delete</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- INVITE -->
    <DeanDialog
      v-model="dialogOpen"
      :departments="departments"
      @success="fetchDeans"
    />

    <!-- EDIT -->
    <DeanDialog
      v-model="editDialogOpen"
      :departments="departments"
      :editData="editingRow"
      @success="fetchDeans"
    />
  </div>
</template>
