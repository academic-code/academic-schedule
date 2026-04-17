<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'
import DeanDialog from '@/components/admin/DeanDialog.vue'

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

type DeanRow = {
  id: string
  created_at: string
  users: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    middle_name: string | null
    is_active: boolean
    last_login_at: string | null
  } | null
  departments: {
    id: string
    name: string
    department_type: 'REGULAR' | 'GENED' | 'PE_NSTP'
  } | null
}

type DepartmentRow = {
  id: string
  name: string
  department_type: 'REGULAR' | 'GENED' | 'PE_NSTP'
}

const supabase = useSupabase()
const notify = useNotifyStore()

const deans = ref<DeanRow[]>([])
const departments = ref<DepartmentRow[]>([])
const loading = ref(false)
const actionLoading = ref(false)
const search = ref('')

const inviteDialogOpen = ref(false)
const editDialogOpen = ref(false)
const confirmDelete = ref(false)

const deletingRow = ref<DeanRow | null>(null)
const editingRow = ref<DeanRow | null>(null)

const normalizeRelation = <T,>(value: T | T[] | null): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    throw new Error('No active session')
  }

  return token
}

const fetchDeans = async () => {
  loading.value = true

  try {
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
          is_active,
          last_login_at
        ),
        departments (
          id,
          name,
          department_type
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    deans.value = (data ?? []).map((row: any) => ({
      ...row,
      users: normalizeRelation(row.users),
      departments: normalizeRelation(row.departments)
    }))
  } catch (err: any) {
    console.error(err)
    notify.error(err?.message || 'Failed to load deans')
  } finally {
    loading.value = false
  }
}

const fetchDepartments = async () => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (error) throw error

    departments.value = data ?? []
  } catch (err: any) {
    notify.error(err?.message || 'Failed to load departments')
  }
}

const inviteState = (row: DeanRow) => {
  if (!row.users?.last_login_at) return 'PENDING'
  return row.users.is_active ? 'ACTIVE' : 'INACTIVE'
}

const filteredDeans = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return deans.value

  return deans.value.filter((row) => {
    const email = row.users?.email?.toLowerCase() ?? ''
    const fullName = [
      row.users?.last_name ?? '',
      row.users?.first_name ?? '',
      row.users?.middle_name ?? ''
    ].join(' ').toLowerCase()

    return email.includes(q) || fullName.includes(q)
  })
})

const assignedDepartmentIds = computed(() => {
  return new Set(
    deans.value
      .map((row) => row.departments?.id)
      .filter(Boolean) as string[]
  )
})

const inviteDepartments = computed(() => {
  return departments.value.filter(
    (dept) => !assignedDepartmentIds.value.has(dept.id)
  )
})

const editDepartments = computed(() => {
  const currentDepartmentId = editingRow.value?.departments?.id

  return departments.value.filter((dept) => {
    if (dept.id === currentDepartmentId) return true
    return !assignedDepartmentIds.value.has(dept.id)
  })
})

const openInvite = () => {
  editingRow.value = null
  inviteDialogOpen.value = true
}

const openEdit = (row: DeanRow) => {
  editingRow.value = row
  editDialogOpen.value = true
}

const editDialogData = computed(() => {
  const row = editingRow.value

  if (!row?.users || !row.departments) return null

  return {
    id: row.id,
    users: row.users,
    departments: row.departments
  }
})

const requestDelete = (row: DeanRow) => {
  deletingRow.value = row
  confirmDelete.value = true
}

const closeDeleteDialog = () => {
  if (actionLoading.value) return
  confirmDelete.value = false
  deletingRow.value = null
}

const executeDelete = async () => {
  if (!deletingRow.value?.users?.id) {
    notify.error('Invalid dean record')
    closeDeleteDialog()
    return
  }

  actionLoading.value = true

  try {
    const token = await getAccessToken()

    await $fetch('/api/admin/delete-dean', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        user_id: deletingRow.value.users.id
      }
    })

    notify.success('Dean removed successfully')
    await fetchDeans()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'Failed to delete dean')
  } finally {
    actionLoading.value = false
    closeDeleteDialog()
  }
}

const toggleStatus = async (row: DeanRow) => {
  if (!row.users?.id) return

  actionLoading.value = true

  try {
    const token = await getAccessToken()

    await $fetch('/api/admin/toggle-dean-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        user_id: row.users.id,
        is_active: !row.users.is_active
      }
    })

    notify.success('Dean status updated')
    await fetchDeans()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'Failed to update status')
  } finally {
    actionLoading.value = false
  }
}

const resendInvite = async (row: DeanRow) => {
  if (!row.users?.id) return

  actionLoading.value = true

  try {
    const token = await getAccessToken()

    await $fetch('/api/admin/resend-dean-invite', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        user_id: row.users.id
      }
    })

    notify.success('Invitation email resent')
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'Failed to resend invite')
  } finally {
    actionLoading.value = false
  }
}

let channel: any

const setupRealtime = () => {
  channel = supabase
    .channel('admin-deans-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deans' },
      () => {
        fetchDeans()
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload: any) => {
        const role = payload.new?.role ?? payload.old?.role
        if (role === 'DEAN') {
          fetchDeans()
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'departments' },
      () => {
        fetchDepartments()
      }
    )
    .subscribe()
}

onMounted(async () => {
  await Promise.all([fetchDepartments(), fetchDeans()])
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
        <h1 class="text-h5 font-weight-bold">Deans</h1>
        <p class="text-body-2 text-medium-emphasis">
          Invite and manage department deans
        </p>
      </div>

      <v-btn color="primary" @click="openInvite">
        Invite Dean
      </v-btn>
    </div>

    <v-text-field
      v-model="search"
      label="Search by name or email"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      clearable
      class="mb-4"
    />

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
            <th class="text-center" width="220">Actions</th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr>
            <td>
              <strong v-if="item.users">
                {{ item.users.last_name }},
                {{ item.users.first_name }}
                <span v-if="item.users.middle_name">
                  {{ item.users.middle_name }}
                </span>
              </strong>

              <div class="text-caption text-medium-emphasis">
                {{ item.users?.email || 'No email' }}
              </div>
            </td>

            <td>
              <v-chip size="small" variant="tonal">
                {{ item.departments?.name || 'No department' }}
              </v-chip>
            </td>

            <td>
              <v-chip
                size="small"
                :color="
                  inviteState(item) === 'PENDING'
                    ? 'orange'
                    : inviteState(item) === 'ACTIVE'
                      ? 'green'
                      : 'grey'
                "
              >
                {{ inviteState(item) }}
              </v-chip>
            </td>

            <td class="text-center">
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
                :color="item.users?.is_active ? 'warning' : 'green'"
                @click="toggleStatus(item)"
              >
                <v-icon size="18">
                  {{ item.users?.is_active ? 'mdi-account-off' : 'mdi-account-check' }}
                </v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="text"
                color="info"
                :disabled="actionLoading || inviteState(item) !== 'PENDING'"
                @click="resendInvite(item)"
              >
                <v-icon size="18">mdi-email-sync</v-icon>
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
            No deans found
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card class="pa-6">
        <h3 class="mb-3">Remove Dean</h3>

        <p class="mb-4">
          This will permanently remove only the dean account.
          Department records, subjects, classes, schedules, and faculty will stay intact.
        </p>

        <div class="d-flex justify-end">
          <v-btn variant="text" :disabled="actionLoading" @click="closeDeleteDialog">
            Cancel
          </v-btn>

          <v-btn
            color="error"
            :loading="actionLoading"
            :disabled="actionLoading"
            @click="executeDelete"
          >
            Delete
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

<DeanDialog
  v-model="inviteDialogOpen"
  :departments="inviteDepartments"
  @success="async () => {
    inviteDialogOpen = false
    await fetchDeans()
  }"
/>

<DeanDialog
  v-model="editDialogOpen"
  :departments="editDepartments"
  :editData="editDialogData"
  @success="async () => {
    editDialogOpen = false
    editingRow = null
    await fetchDeans()
  }"
/>
  </div>
</template>