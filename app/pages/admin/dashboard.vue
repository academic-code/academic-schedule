<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useSupabase } from '@/composables/useSupabase'

definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})

const supabase = useSupabase()

// ================= KPI COUNTS =================
const departmentsCount = ref(0)
const deansCount = ref(0)
const facultyCount = ref(0)
const schedulesCount = ref(0)

// ================= RECENT ACTIVITY =================
const recentActivity = ref<any[]>([])

// ================= FETCH COUNTS =================
const fetchCounts = async () => {
  const [d, de, f, s] = await Promise.all([
    supabase.from('departments').select('id', { count: 'exact', head: true }),
    supabase.from('deans').select('id', { count: 'exact', head: true }),
    supabase.from('faculty').select('id', { count: 'exact', head: true }),
    supabase.from('schedules').select('id', { count: 'exact', head: true })
  ])

  departmentsCount.value = d.count ?? 0
  deansCount.value = de.count ?? 0
  facultyCount.value = f.count ?? 0
  schedulesCount.value = s.count ?? 0
}

// ================= FETCH ACTIVITY =================
const fetchRecentActivity = async () => {
  const { data } = await supabase
    .from('audit_logs')
    .select('action, entity_type, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  recentActivity.value = data ?? []
}

// ================= REALTIME =================
let channel: any

const setupRealtime = () => {
  channel = supabase
    .channel('admin-dashboard-realtime')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => {
      fetchCounts()
      fetchRecentActivity()
    })
    .subscribe()
}

onMounted(async () => {
  await fetchCounts()
  await fetchRecentActivity()
  setupRealtime()
})

onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
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

    <!-- KPI CARDS -->
    <v-row class="mb-10" dense>
      <v-col cols="12" sm="6" lg="3">
        <v-card class="kpi-card kpi-blue pa-6">
          <div class="kpi-top">
            <v-icon class="kpi-icon" color="primary">
              mdi-office-building
            </v-icon>
            <span class="kpi-label">Departments</span>
          </div>
          <div class="kpi-value">{{ departmentsCount }}</div>
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
          <div class="kpi-value">{{ deansCount }}</div>
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
          <div class="kpi-value">{{ facultyCount }}</div>
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
          <div class="kpi-value">{{ schedulesCount }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- LOWER GRID -->
    <v-row>
      <!-- RECENT ACTIVITY -->
      <v-col cols="12" lg="7">
        <v-card class="pa-6 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">
            Recent Activity
          </h3>

          <v-list density="comfortable">
            <v-list-item
              v-for="(item, i) in recentActivity"
              :key="i"
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

      <!-- GETTING STARTED -->
      <v-col cols="12" lg="5">
        <v-card class="pa-6 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">
            Getting Started
          </h3>

          <v-alert type="info" variant="tonal" class="mb-4">
            Your system is ready. Start by creating departments and assigning deans.
          </v-alert>

          <v-btn
            block
            color="primary"
            class="mb-3"
            to="/admin/departments"
          >
            Create First Department
          </v-btn>

          <v-btn
            block
            variant="outlined"
            color="indigo"
            to="/admin/deans"
          >
            Assign a Dean
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

/* ================= KPI CARDS ================= */
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

/* Accent borders */
.kpi-blue { border-left: 6px solid #1976d2; }
.kpi-indigo { border-left: 6px solid #3f51b5; }
.kpi-teal { border-left: 6px solid #009688; }
.kpi-purple { border-left: 6px solid #673ab7; }

/* ================= RESPONSIVE ================= */
@media (max-width: 600px) {
  .kpi-card {
    min-height: 120px;
  }

  .kpi-value {
    font-size: 2.2rem;
  }
}
</style>
