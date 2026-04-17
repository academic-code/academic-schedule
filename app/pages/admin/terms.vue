<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'
import AcademicTermDialog from '@/components/admin/AcademicTermDialog.vue'

type AcademicTermRow = {
  id: string
  academic_year: string
  semester: number
  is_active: boolean
  is_locked: boolean
  created_at: string
}

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

const supabase = useSupabase()
const notify = useNotifyStore()

const terms = ref<AcademicTermRow[]>([])
const loading = ref(false)
const actionLoading = ref(false)
const search = ref('')

const dialogOpen = ref(false)
const confirmActivate = ref(false)
const confirmDelete = ref(false)

const selectedRow = ref<AcademicTermRow | null>(null)
const suggested = ref<{ academic_year: string; semester: number } | null>(null)

const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    throw new Error('No active session')
  }

  return token
}

const fetchTerms = async () => {
  loading.value = true

  try {
    const token = await getAccessToken()

    const res = await $fetch<{ data: AcademicTermRow[] }>('/api/admin/academic-terms/list', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    terms.value = res.data ?? []
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'Failed to load academic terms')
  } finally {
    loading.value = false
  }
}

const semesterLabel = (s: number) =>
  s === 1 ? '1st Semester' : s === 2 ? '2nd Semester' : 'Summer'

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return terms.value

  return terms.value.filter((term) =>
    term.academic_year.toLowerCase().includes(q) ||
    semesterLabel(term.semester).toLowerCase().includes(q)
  )
})

const suggestNext = () => {
  const latest = terms.value[0]

  if (!latest) {
    suggested.value = {
      academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      semester: 1
    }
    dialogOpen.value = true
    return
  }

  if (latest.semester === 1) {
    suggested.value = {
      academic_year: latest.academic_year,
      semester: 2
    }
  } else if (latest.semester === 2) {
    suggested.value = {
      academic_year: latest.academic_year,
      semester: 3
    }
  } else {
    const parts = latest.academic_year.split('-').map(Number)
    const firstPart = parts[0]

    if (firstPart === undefined || Number.isNaN(firstPart)) {
      notify.warning('Latest academic year format is invalid')
      return
    }

    const start = firstPart

    suggested.value = {
      academic_year: `${start + 1}-${start + 2}`,
      semester: 1
    }
  }

  dialogOpen.value = true
}

const requestActivate = (row: AcademicTermRow) => {
  selectedRow.value = row
  confirmActivate.value = true
}

const closeActivateDialog = () => {
  if (actionLoading.value) return
  confirmActivate.value = false
  selectedRow.value = null
}

const activateTerm = async () => {
  if (!selectedRow.value) return

  actionLoading.value = true

  try {
    const token = await getAccessToken()

    await $fetch('/api/admin/academic-terms/activate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        id: selectedRow.value.id
      }
    })

    notify.success('Academic term activated')
    await fetchTerms()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'Failed to activate academic term')
  } finally {
    actionLoading.value = false
    closeActivateDialog()
  }
}

const toggleLock = async (row: AcademicTermRow) => {
  actionLoading.value = true

  try {
    const token = await getAccessToken()

    await $fetch('/api/admin/academic-terms/toggle-lock', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        id: row.id,
        is_locked: !row.is_locked
      }
    })

    notify.success(row.is_locked ? 'Academic term unlocked' : 'Academic term locked')
    await fetchTerms()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'Failed to update lock status')
  } finally {
    actionLoading.value = false
  }
}

const requestDelete = (row: AcademicTermRow) => {
  selectedRow.value = row
  confirmDelete.value = true
}

const closeDeleteDialog = () => {
  if (actionLoading.value) return
  confirmDelete.value = false
  selectedRow.value = null
}

const executeDelete = async () => {
  if (!selectedRow.value) return

  actionLoading.value = true

  try {
    const token = await getAccessToken()

    await $fetch('/api/admin/academic-terms/delete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        id: selectedRow.value.id
      }
    })

    notify.success('Academic term deleted')
    await fetchTerms()
  } catch (err: any) {
    notify.error(err?.data?.message || err?.message || 'Failed to delete academic term')
  } finally {
    actionLoading.value = false
    closeDeleteDialog()
  }
}

onMounted(async () => {
  await fetchTerms()
})
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

      <div class="d-flex ga-2">
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
                :disabled="actionLoading || item.is_active"
                @click="requestActivate(item)"
              >
                <v-icon>mdi-power</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                color="warning"
                :disabled="actionLoading || !item.is_active"
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
                :disabled="actionLoading || item.is_active"
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

    <v-dialog v-model="confirmActivate" max-width="420">
      <v-card class="pa-6">
        <h3 class="mb-3">Activate Academic Term</h3>
        <p>
          This will deactivate the current active term.
          <br />
          Only one academic term can be active at a time.
        </p>

        <div class="d-flex justify-end">
          <v-btn variant="text" :disabled="actionLoading" @click="closeActivateDialog">
            Cancel
          </v-btn>

          <v-btn color="success" :loading="actionLoading" :disabled="actionLoading" @click="activateTerm">
            Activate
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmDelete" max-width="420">
      <v-card class="pa-6">
        <h3 class="mb-3">Delete Academic Term</h3>
        <p>
          This action cannot be undone.
          <br />
          Active academic terms cannot be deleted.
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
  </div>
</template>