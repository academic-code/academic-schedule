<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'
import AcademicTermDialog from '@/components/admin/AcademicTermDialog.vue'

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

const supabase = useSupabase()
const notify = useNotifyStore()

const terms = ref<any[]>([])
const loading = ref(false)
const search = ref('')

// dialogs
const dialogOpen = ref(false)
const confirmActivate = ref(false)
const confirmDelete = ref(false)

// selection
const selectedRow = ref<any | null>(null)
const suggested = ref<any | null>(null)

// ================= FETCH =================
const fetchTerms = async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('academic_terms')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) notify.error(error.message)
  else terms.value = data ?? []

  loading.value = false
}

// ================= HELPERS =================
const semesterLabel = (s: number) =>
  s === 1 ? '1st Semester' : s === 2 ? '2nd Semester' : 'Summer'

// ================= SEARCH =================
const filtered = computed(() => {
  if (!search.value) return terms.value
  const q = search.value.toLowerCase()

  return terms.value.filter(t =>
    t.academic_year.toLowerCase().includes(q) ||
    semesterLabel(t.semester).toLowerCase().includes(q)
  )
})

// ================= SUGGEST NEXT =================
const suggestNext = () => {
  if (!terms.value.length) {
    notify.warning('No existing academic term found')
    return
  }

  const latest = terms.value[0]

  if (latest.semester === 1) {
    suggested.value = { academic_year: latest.academic_year, semester: 2 }
  } else if (latest.semester === 2) {
    suggested.value = { academic_year: latest.academic_year, semester: 3 }
  } else {
    const [start] = latest.academic_year.split('-').map(Number)
    suggested.value = {
      academic_year: `${start + 1}-${start + 2}`,
      semester: 1
    }
  }

  dialogOpen.value = true
}

// ================= ACTIVATE =================
const requestActivate = (row: any) => {
  selectedRow.value = row
  confirmActivate.value = true
}

const activateTerm = async () => {
  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/academic-terms/activate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: { id: selectedRow.value.id }
    })

    notify.success('Academic term activated')
    fetchTerms()
  } catch (err: any) {
    notify.error(err?.data?.message)
  } finally {
    confirmActivate.value = false
    selectedRow.value = null
  }
}

// ================= LOCK =================
const toggleLock = async (row: any) => {
  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/academic-terms/toggle-lock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: {
        id: row.id,
        is_locked: !row.is_locked
      }
    })

    notify.success(row.is_locked ? 'Scheduling unlocked' : 'Scheduling locked')
    fetchTerms()
  } catch (err: any) {
    notify.error(err?.data?.message)
  }
}

// ================= DELETE =================
const requestDelete = (row: any) => {
  selectedRow.value = row
  confirmDelete.value = true
}

const executeDelete = async () => {
  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/academic-terms/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: { id: selectedRow.value.id }
    })

    notify.success('Academic term deleted')
    fetchTerms()
  } catch (err: any) {
    notify.error(err?.data?.message)
  } finally {
    confirmDelete.value = false
    selectedRow.value = null
  }
}

onMounted(fetchTerms)
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold">Academic Terms</h1>
        <p class="text-body-2 text-medium-emphasis">
          Manage school years and semesters
        </p>
      </div>

      <div class="d-flex gap-2">
        <v-btn variant="outlined" @click="suggestNext">
          Suggest Next Term
        </v-btn>
        <v-btn color="primary" @click="dialogOpen = true">
          Add Term
        </v-btn>
      </div>
    </div>

    <v-text-field
      v-model="search"
      label="Search academic year or semester"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      clearable
      class="mb-4"
    />

    <v-card>
      <v-data-table :items="filtered" :loading="loading">
        <template #headers>
          <tr>
            <th>Academic Year</th>
            <th>Semester</th>
            <th>Status</th>
            <th>Created</th>
            <th class="text-center">Actions</th>
          </tr>
        </template>

        <template #item="{ item }">
          <tr>
            <td><strong>{{ item.academic_year }}</strong></td>
            <td>{{ semesterLabel(item.semester) }}</td>
            <td>
              <v-chip size="small" :color="item.is_active ? 'green' : 'grey'">
                {{ item.is_active ? 'ACTIVE' : 'INACTIVE' }}
              </v-chip>
              <v-chip
                v-if="item.is_locked"
                size="small"
                color="red"
                class="ml-2"
              >
                LOCKED
              </v-chip>
            </td>
            <td>{{ new Date(item.created_at).toLocaleDateString() }}</td>
            <td class="text-center">
              <v-btn
                icon
                size="small"
                color="success"
                :disabled="item.is_active"
                @click="requestActivate(item)"
              >
                <v-icon>mdi-power</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                color="warning"
                :disabled="!item.is_active"
                @click="toggleLock(item)"
              >
                <v-icon>
                  {{ item.is_locked ? 'mdi-lock' : 'mdi-lock-open-outline' }}
                </v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                color="error"
                :disabled="item.is_active"
                @click="requestDelete(item)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <AcademicTermDialog
      v-model="dialogOpen"
      :suggested="suggested"
      @success="fetchTerms"
    />

    <!-- CONFIRM ACTIVATE -->
    <v-dialog v-model="confirmActivate" max-width="420">
      <v-card class="pa-6">
        <h3>Activate Academic Term</h3>
        <p>This will deactivate the current active term.</p>
        <div class="d-flex justify-end">
          <v-btn variant="text" @click="confirmActivate = false">Cancel</v-btn>
          <v-btn color="success" @click="activateTerm">Activate</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- CONFIRM DELETE -->
    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card class="pa-6">
        <h3>Delete Academic Term</h3>
        <p>This action cannot be undone.</p>
        <div class="d-flex justify-end">
          <v-btn variant="text" @click="confirmDelete = false">Cancel</v-btn>
          <v-btn color="error" @click="executeDelete">Delete</v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>
