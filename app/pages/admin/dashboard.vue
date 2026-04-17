<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

type DashboardStats = {
  departments: number
  deans: number
  faculty: number
  schedules: number
}

type ActiveTerm = {
  id: string
  academic_year: string
  semester: number
  is_active: boolean
  is_locked: boolean
  created_at: string
} | null

type ActivityItem = {
  id: string
  action: string
  entity_type: string
  created_at: string
}

const supabase = useSupabase()
const notify = useNotifyStore()

const loading = ref(false)

const stats = ref<DashboardStats>({
  departments: 0,
  deans: 0,
  faculty: 0,
  schedules: 0
})

const activeTerm = ref<ActiveTerm>(null)
const recentActivity = ref<ActivityItem[]>([])

const semesterLabel = (semester: number) =>
  semester === 1 ? '1st Semester' : semester === 2 ? '2nd Semester' : 'Summer'

const activeTermLabel = computed(() => {
  if (!activeTerm.value) return 'No active academic term'
  return `${activeTerm.value.academic_year} • ${semesterLabel(activeTerm.value.semester)}`
})

const setupChecklist = computed(() => {
  return [
    {
      title: 'Departments',
      done: stats.value.departments > 0,
      text: stats.value.departments > 0
        ? `${stats.value.departments} department(s) created`
        : 'Create departments first'
    },
    {
      title: 'Deans',
      done: stats.value.deans > 0,
      text: stats.value.deans > 0
        ? `${stats.value.deans} dean account(s) assigned`
        : 'Assign dean accounts'
    },
    {
      title: 'Academic Term',
      done: !!activeTerm.value,
      text: activeTerm.value
        ? activeTermLabel.value
        : 'Activate one academic term'
    }
  ]
})

const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    throw new Error('No active session')
  }

  return token
}

const fetchDashboard = async () => {
  loading.value = true

  try {
    const token = await getAccessToken()

    const res = await $fetch<{
      stats: DashboardStats
      activeTerm: ActiveTerm
      recentActivity: ActivityItem[]
    }>('/api/admin/dashboard', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    stats.value = res.stats
    activeTerm.value = res.activeTerm
    recentActivity.value = res.recentActivity ?? []
  } catch (err: any) {
    notify.error(
      err?.data?.message ||
      err?.message ||
      'Failed to load dashboard'
    )
  } finally {
    loading.value = false
  }
}

let channel: any

const setupRealtime = () => {
  channel = supabase
    .channel('admin-dashboard-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'departments' },
      fetchDashboard
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deans' },
      fetchDashboard
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'faculty' },
      fetchDashboard
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'schedules' },
      fetchDashboard
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'academic_terms' },
      fetchDashboard
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'audit_logs' },
      fetchDashboard
    )
    .subscribe()
}

onMounted(async () => {
  await fetchDashboard()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (channel) {
    supabase.removeChannel(channel)
  }
})
</script>

<template>
  <div class="admin-dashboard">
    <!-- HEADER -->
    <div class="dashboard-header mb-8">
      <h1 class="text-h4 font-weight-bold">
        Welcome, Administrator
      </h1>
      <p class="text-body-1 text-medium-emphasis">
        Overview of system activity and management
      </p>
    </div>

    <!-- TOP SUMMARY -->
    <v-row class="mb-6" dense>
      <v-col cols="12" lg="8">
        <v-card class="pa-6 summary-card h-100">
          <div class="d-flex flex-column flex-md-row justify-space-between align-start ga-4">
            <div>
              <div class="text-overline text-medium-emphasis mb-1">
                Active Academic Term
              </div>

              <h2 class="text-h6 font-weight-bold mb-2">
                {{ activeTermLabel }}
              </h2>

              <div v-if="activeTerm" class="d-flex align-center flex-wrap ga-2">
                <v-chip size="small" color="green">
                  ACTIVE
                </v-chip>

                <v-chip
                  size="small"
                  :color="activeTerm.is_locked ? 'red' : 'blue-grey'"
                >
                  {{ activeTerm.is_locked ? 'LOCKED' : 'UNLOCKED' }}
                </v-chip>
              </div>

              <p v-else class="text-body-2 text-medium-emphasis mt-2">
                No academic term is currently active. Activate one from the Academic Terms module.
              </p>
            </div>

            <div class="summary-actions">
              <v-btn color="primary" to="/admin/terms">
                Manage Terms
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" lg="4">
        <v-card class="pa-6 h-100">
          <div class="text-subtitle-1 font-weight-bold mb-4">
            Setup Status
          </div>

          <div
            v-for="item in setupChecklist"
            :key="item.title"
            class="d-flex align-start mb-4"
          >
            <v-icon
              class="mr-3 mt-1"
              :color="item.done ? 'green' : 'grey'"
            >
              {{ item.done ? 'mdi-check-circle' : 'mdi-clock-outline' }}
            </v-icon>

            <div>
              <div class="font-weight-medium">
                {{ item.title }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ item.text }}
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- KPI CARDS -->
    <v-row class="mb-8" dense>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card kpi-blue pa-6">
          <div class="kpi-top">
            <v-icon class="kpi-icon" color="primary">
              mdi-office-building
            </v-icon>
            <span class="kpi-label">Departments</span>
          </div>
          <div class="kpi-value">{{ stats.departments }}</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card kpi-indigo pa-6">
          <div class="kpi-top">
            <v-icon class="kpi-icon" color="indigo">
              mdi-account-tie
            </v-icon>
            <span class="kpi-label">Deans</span>
          </div>
          <div class="kpi-value">{{ stats.deans }}</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card kpi-teal pa-6">
          <div class="kpi-top">
            <v-icon class="kpi-icon" color="teal">
              mdi-account-group
            </v-icon>
            <span class="kpi-label">Faculty</span>
          </div>
          <div class="kpi-value">{{ stats.faculty }}</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card kpi-purple pa-6">
          <div class="kpi-top">
            <v-icon class="kpi-icon" color="deep-purple">
              mdi-calendar-clock
            </v-icon>
            <span class="kpi-label">Schedules</span>
          </div>
          <div class="kpi-value">{{ stats.schedules }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- LOWER GRID -->
    <v-row>
      <v-col cols="12" lg="7">
        <v-card class="pa-6 h-100">
          <div class="d-flex justify-space-between align-center mb-4">
            <h3 class="text-subtitle-1 font-weight-bold">
              Recent Activity
            </h3>

            <v-btn
              size="small"
              variant="text"
              :loading="loading"
              @click="fetchDashboard"
            >
              Refresh
            </v-btn>
          </div>

          <v-list density="comfortable">
            <v-list-item
              v-for="item in recentActivity"
              :key="item.id"
            >
              <template #prepend>
                <v-icon color="primary">mdi-history</v-icon>
              </template>

              <v-list-item-title>
                {{ item.action }} — {{ item.entity_type }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ new Date(item.created_at).toLocaleString() }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="!recentActivity.length">
              <v-list-item-title class="text-medium-emphasis">
                No recent activity yet
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card class="pa-6 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">
            Quick Actions
          </h3>

          <v-alert
            type="info"
            variant="tonal"
            class="mb-4"
          >
            Use the shortcuts below to continue system setup and administration.
          </v-alert>

          <v-btn
            block
            color="primary"
            class="mb-3"
            to="/admin/departments"
          >
            Manage Departments
          </v-btn>

          <v-btn
            block
            variant="outlined"
            color="indigo"
            class="mb-3"
            to="/admin/deans"
          >
            Manage Deans
          </v-btn>

          <v-btn
            block
            variant="outlined"
            color="teal"
            class="mb-3"
            to="/admin/rooms"
          >
            Manage Rooms
          </v-btn>

          <v-btn
            block
            variant="outlined"
            color="deep-purple"
            to="/admin/terms"
          >
            Manage Academic Terms
          </v-btn>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.admin-dashboard {
  max-width: 1400px;
}

.summary-card {
  border-radius: 18px;
}

.summary-actions {
  min-width: 160px;
  display: flex;
  justify-content: flex-end;
}

/* KPI CARDS */
.kpi-card {
  border-radius: 18px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.1);
}

.kpi-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kpi-icon {
  font-size: 30px;
}

.kpi-label {
  font-size: 0.95rem;
  color: #6b7280;
  font-weight: 500;
}

.kpi-value {
  font-size: 2.6rem;
  font-weight: 700;
  margin-top: 12px;
}

.kpi-blue { border-left: 6px solid #1976d2; }
.kpi-indigo { border-left: 6px solid #3f51b5; }
.kpi-teal { border-left: 6px solid #009688; }
.kpi-purple { border-left: 6px solid #673ab7; }

@media (max-width: 600px) {
  .kpi-card {
    min-height: 120px;
  }

  .kpi-value {
    font-size: 2.2rem;
  }

  .summary-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>