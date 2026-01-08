<script setup lang="ts">
import { useAuthStore } from "@/stores/useAuthStore"
import { useDeanDashboardStore } from "@/stores/useDeanDashboardStore"
import { useRoute } from "vue-router"
import { computed } from "vue"

const auth = useAuthStore()
const dashboard = useDeanDashboardStore()
const route = useRoute()

const isActive = (path: string) => route.path.startsWith(path)

/**
 * ✅ REGULAR dean can see everything
 * ❌ GENED / PE_NSTP are restricted
 */
const isRegularDean = computed(() => {
  return dashboard.department?.department_type === "REGULAR"
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

    <v-list nav density="comfortable">
      <!-- DASHBOARD -->
      <v-list-item
        to="/dean/dashboard"
        prepend-icon="mdi-view-dashboard"
        :active="isActive('/dean/dashboard')"
      >
        Dashboard
      </v-list-item>

      <!-- FACULTY (ALL DEANS CAN SEE) -->
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

      <!-- SCHEDULES (ALL DEANS CAN SEE) -->
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
