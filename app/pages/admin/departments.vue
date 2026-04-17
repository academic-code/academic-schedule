<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'
import { logAudit } from '@/utils/auditLogger'
import DepartmentDialog from '@/components/admin/DepartmentDialog.vue'

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

const supabase = useSupabase()
const notify = useNotifyStore()

const departments = ref<any[]>([])
const loading = ref(false)
const deleting = ref(false)
const search = ref('')

// dialog
const dialogOpen = ref(false)
const selectedDepartment = ref<any | null>(null)

// delete flow
const confirmDelete = ref(false)
const forceDelete = ref(false)
const deletingRow = ref<any | null>(null)

// ================= FETCH =================
const fetchDepartments = async () => {
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (error) throw error

    departments.value = data ?? []
  } catch (err: any) {
    notify.error(err?.message || 'Failed to load departments')
  } finally {
    loading.value = false
  }
}

// ================= SEARCH =================
const filteredDepartments = computed(() => {
  if (!search.value) return departments.value

  return departments.value.filter((d) =>
    d.name.toLowerCase().includes(search.value.toLowerCase())
  )
})

// ================= DIALOG =================
const openCreateDialog = () => {
  selectedDepartment.value = null
  dialogOpen.value = true
}

const openEditDialog = (row: any) => {
  selectedDepartment.value = row
  dialogOpen.value = true
}

// ================= DELETE =================
const requestDelete = (row: any) => {
  deletingRow.value = row
  forceDelete.value = false
  confirmDelete.value = true
}

const closeDeleteDialog = () => {
  confirmDelete.value = false
  forceDelete.value = false
  deletingRow.value = null
}

const executeDelete = async () => {
  if (!deletingRow.value || deleting.value) return

  deleting.value = true

  try {
    const { error } = await supabase.rpc('delete_department_cascade', {
      p_department_id: deletingRow.value.id,
      p_force: forceDelete.value
    })

    if (error) throw error

    notify.success(
      forceDelete.value
        ? 'Department and all related data deleted'
        : 'Department deleted'
    )

    await logAudit({
      action: 'DELETE',
      entity_type: 'DEPARTMENT',
      entity_id: deletingRow.value.id,
      old_value: deletingRow.value,
      new_value: null
    })

    closeDeleteDialog()

    // safety refresh
    await fetchDepartments()
  } catch (err: any) {
    const message = err?.message || 'Delete failed'

    notify.error(
      message.includes('connected data')
        ? 'Department has connected data. Use force delete.'
        : message
    )
  } finally {
    deleting.value = false
  }
}

// ================= REALTIME =================
let channel: any

const setupRealtime = () => {
  channel = supabase
    .channel('departments-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'departments' },
      fetchDepartments
    )
    .subscribe()
}

onMounted(async () => {
  await fetchDepartments()
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
        <h1 class="text-h5 font-weight-bold">Departments</h1>
        <p class="text-body-2 text-medium-emphasis">
          Manage academic departments
        </p>
      </div>

      <v-btn color="primary" @click="openCreateDialog">
        Add Department
      </v-btn>
    </div>

    <!-- SEARCH -->
    <v-text-field
      v-model="search"
      label="Search departments"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      class="mb-4"
    />

    <!-- TABLE -->
    <v-card>
      <v-data-table
        :items="filteredDepartments"
        :loading="loading"
        item-key="id"
        density="comfortable"
      >
        <template #headers>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th class="text-center" width="120">Actions</th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr>
            <td>{{ item.name }}</td>

            <td>
              <v-chip
                size="small"
                variant="tonal"
                :color="
                  item.department_type === 'REGULAR'
                    ? 'primary'
                    : item.department_type === 'GENED'
                      ? 'green'
                      : 'pink'
                "
              >
                {{
                  item.department_type === 'REGULAR'
                    ? 'Regular'
                    : item.department_type === 'GENED'
                      ? 'General Education'
                      : 'PE & NSTP'
                }}
              </v-chip>
            </td>

            <td class="text-center">
              <div class="d-flex align-center justify-center ga-2">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="openEditDialog(item)"
                >
                  <v-icon size="18">mdi-pencil</v-icon>
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
              </div>
            </td>
          </tr>
        </template>

        <template #no-data>
          <div class="pa-6 text-center text-medium-emphasis">
            No departments found
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- DELETE CONFIRMATION -->
    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card class="pa-6">
        <h3 class="text-subtitle-1 font-weight-bold mb-3">
          Confirm Department Deletion
        </h3>

        <p class="text-body-2 mb-4">
          This action cannot be undone.
        </p>

        <v-checkbox
          v-model="forceDelete"
          label="Force delete (remove all connected data)"
          color="error"
        />

        <div class="d-flex justify-end mt-4">
          <v-btn variant="text" :disabled="deleting" @click="closeDeleteDialog">
            Cancel
          </v-btn>

          <v-btn
            color="error"
            class="ml-2"
            :loading="deleting"
            :disabled="deleting"
            @click="executeDelete"
          >
            Delete
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- CREATE / EDIT DIALOG -->
    <DepartmentDialog
      v-model="dialogOpen"
      :department="selectedDepartment"
      :existingDepartments="departments"
      @saved="fetchDepartments"
    />
  </div>
</template>