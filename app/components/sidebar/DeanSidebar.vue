<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'
import { useRoute } from 'vue-router'

const auth = useAuthStore()
const route = useRoute()

const isActive = (path: string) => route.path.startsWith(path)

const logout = async () => {
  await auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <v-navigation-drawer permanent width="270">
    <div class="logo">
      <v-img src="/Logo.png" max-width="190" contain />
    </div>

    <v-divider />

    <v-list nav density="comfortable">
  

      <v-list-item
        to="/dean/dashboard"
        prepend-icon="mdi-view-dashboard"
        :active="isActive('/dean/dashboard')"
      >
        Dashboard
      </v-list-item>

      <v-list-item
        to="/dean/faculty"
        prepend-icon="mdi-account-group"
        :active="isActive('/dean/faculty')"
      >
        Faculty
      </v-list-item>

      <v-list-item
        to="/dean/classes"
        prepend-icon="mdi-google-classroom"
        :active="isActive('/dean/classes')"
      >
        Classes
      </v-list-item>

      <v-list-item
        to="/dean/subjects"
        prepend-icon="mdi-book-open-variant"
        :active="isActive('/dean/subjects')"
      >
        Subjects
      </v-list-item>

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
