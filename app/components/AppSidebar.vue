<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'
import { computed } from 'vue'

const auth = useAuthStore()

const role = computed(() => auth.user?.role)
</script>

<template>
  <v-navigation-drawer permanent width="260">
    <!-- LOGO -->
    <v-list-item class="px-4 py-3">
      <v-img
        src="/Logo.png"
        max-width="180"
        contain
      />
    </v-list-item>

    <v-divider />

    <!-- ADMIN MENU -->
    <v-list v-if="role === 'ADMIN'">
      <v-list-item to="/admin/dashboard" prepend-icon="mdi-view-dashboard">
        Dashboard
      </v-list-item>

      <v-list-item to="/admin/departments" prepend-icon="mdi-office-building">
        Departments
      </v-list-item>

      <v-list-item to="/admin/deans" prepend-icon="mdi-account-tie">
        Deans
      </v-list-item>

      <v-list-item to="/admin/rooms" prepend-icon="mdi-door">
        Rooms
      </v-list-item>

      <v-list-item to="/admin/terms" prepend-icon="mdi-calendar">
        Academic Terms
      </v-list-item>
    </v-list>

    <!-- REGULAR DEAN MENU -->
    <v-list v-else-if="role === 'DEAN'">
      <v-list-item to="/dean/dashboard" prepend-icon="mdi-view-dashboard">
        Dashboard
      </v-list-item>

      <v-list-item to="/dean/faculty" prepend-icon="mdi-account-group">
        Faculty
      </v-list-item>

      <v-list-item to="/dean/classes" prepend-icon="mdi-google-classroom">
        Classes
      </v-list-item>

      <v-list-item to="/dean/subjects" prepend-icon="mdi-book-open-page-variant">
        Subjects
      </v-list-item>

      <v-list-item to="/dean/schedules" prepend-icon="mdi-calendar-clock">
        Schedules
      </v-list-item>
    </v-list>

    <!-- FACULTY MENU -->
    <v-list v-else-if="role === 'FACULTY'">
      <v-list-item to="/faculty/schedule" prepend-icon="mdi-calendar">
        My Schedule
      </v-list-item>
    </v-list>

    <v-divider />

    <!-- LOGOUT -->
    <v-list>
      <v-list-item @click="auth.signOut()" prepend-icon="mdi-logout">
        Logout
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>
