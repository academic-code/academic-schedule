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
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')

  if (error) {
    notify.error('Failed to load departments')
  } else {
    departments.value = data ?? []
  }
  loading.value = false
}

// ================= SEARCH =================
const filteredDepartments = computed(() => {
  if (!search.value) return departments.value
  return departments.value.filter(d =>
    d.name.toLowerCase().includes(search.value.toLowerCase())
  )
})

// ================= DELETE =================
const requestDelete = (row: any) => {
  deletingRow.value = row
  forceDelete.value = false
  confirmDelete.value = true
}

const executeDelete = async () => {
  if (!deletingRow.value) return

  try {
    await supabase.rpc('delete_department_cascade', {
      p_department_id: deletingRow.value.id,
      p_force: forceDelete.value
    })

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

    confirmDelete.value = false
    deletingRow.value = null

    // safety refresh (realtime already does this)
    await fetchDepartments()
  } catch (err: any) {
    notify.error(
      err.message?.includes('connected data')
        ? 'Department has connected data. Use force delete.'
        : err.message || 'Delete failed'
    )
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

      <v-btn
        color="primary"
        @click="() => { selectedDepartment = null; dialogOpen = true }"
      >
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

            <!-- COLOR CODED TYPE -->
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

            <!-- ONE-LINE ACTIONS -->
            <td class="text-center">
              <div class="d-flex align-center justify-center gap-2">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="() => { selectedDepartment = item; dialogOpen = true }"
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
          <v-btn variant="text" @click="confirmDelete = false">
            Cancel
          </v-btn>

          <v-btn color="error" class="ml-2" @click="executeDelete">
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
