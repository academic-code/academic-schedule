<script setup lang="ts">
import { useAuthStore } from "@/stores/useAuthStore"
import { useDeanDashboardStore } from "@/stores/useDeanDashboardStore"
import { useRoute } from "vue-router"
import { computed, onMounted } from "vue"

const auth = useAuthStore()
const dashboard = useDeanDashboardStore()
const route = useRoute()

const isActive = (path: string) => route.path.startsWith(path)

/**
 * 🔑 ENSURE DASHBOARD CONTEXT EXISTS
 * Sidebar must bootstrap dashboard on refresh
 */
onMounted(async () => {
  if (!dashboard.department && !dashboard.loading) {
    await dashboard.fetchDashboard()
  }
})

/**
 * Sidebar ready only when department is known
 */
const sidebarReady = computed(() => {
  return !!dashboard.department
})

/**
 * ✅ REGULAR dean logic
 * Safe default prevents GENED flicker
 */
const isRegularDean = computed(() => {
  if (!dashboard.department) return true
  return dashboard.department.department_type === "REGULAR"
})

const logout = async () => {
  await auth.signOut()
  await navigateTo("/login")
}
</script>

<template>
  <v-navigation-drawer permanent width="270">
    <div class="logo">
      <v-img src="/Logo.png" max-width="190" contain />
    </div>

    <v-divider />

    <!-- ⏳ LOADING STATE -->
    <div
      v-if="!sidebarReady"
      class="pa-4 text-grey text-caption"
    >
      Loading menu…
    </div>

    <!-- ✅ REAL MENU -->
    <v-list
      v-else
      nav
      density="comfortable"
    >
      <!-- DASHBOARD -->
      <v-list-item
        to="/dean/dashboard"
        prepend-icon="mdi-view-dashboard"
        :active="isActive('/dean/dashboard')"
      >
        Dashboard
      </v-list-item>

      <!-- FACULTY (ALL DEANS) -->
      <v-list-item
        to="/dean/faculty"
        prepend-icon="mdi-account-group"
        :active="isActive('/dean/faculty')"
      >
        Faculty
      </v-list-item>

      <!-- CLASSES (REGULAR ONLY) -->
      <v-list-item
        v-if="isRegularDean"
        to="/dean/classes"
        prepend-icon="mdi-google-classroom"
        :active="isActive('/dean/classes')"
      >
        Classes
      </v-list-item>

      <!-- SUBJECTS (REGULAR ONLY) -->
      <v-list-item
        v-if="isRegularDean"
        to="/dean/subjects"
        prepend-icon="mdi-book-open-variant"
        :active="isActive('/dean/subjects')"
      >
        Subjects
      </v-list-item>

      <!-- CURRICULUMS (REGULAR ONLY) -->
      <v-list-item
        v-if="isRegularDean"
        to="/dean/curriculums"
        prepend-icon="mdi-book-education-outline"
        :active="isActive('/dean/curriculums')"
      >
        Curriculums
      </v-list-item>

      <!-- SCHEDULES (ALL DEANS) -->
      <v-list-item
        to="/dean/schedules"
        prepend-icon="mdi-calendar-clock"
        :active="isActive('/dean/schedules')"
      >
        Schedules
      </v-list-item>
    </v-list>

    <v-spacer />

    <v-divider />

    <v-list nav density="comfortable">
      <v-list-item prepend-icon="mdi-logout" @click="logout">
        Logout
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
.logo {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
}
</style>
