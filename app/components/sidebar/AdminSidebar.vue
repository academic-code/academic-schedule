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
    <!-- LOGO -->
    <div class="logo">
      <v-img src="/Logo.png" max-width="190" contain />
    </div>

    <v-divider />

    <v-list nav density="comfortable">
      <v-list-item
        to="/admin/dashboard"
        prepend-icon="mdi-view-dashboard"
        :active="isActive('/admin/dashboard')"
      >
        Dashboard
      </v-list-item>

      <v-list-item
        to="/admin/departments"
        prepend-icon="mdi-office-building"
        :active="isActive('/admin/departments')"
      >
        Departments
      </v-list-item>

      <v-list-item
        to="/admin/deans"
        prepend-icon="mdi-account-tie"
        :active="isActive('/admin/deans')"
      >
        Deans
      </v-list-item>

      <v-list-item
        to="/admin/rooms"
        prepend-icon="mdi-door"
        :active="isActive('/admin/rooms')"
      >
        Rooms
      </v-list-item>

      <v-list-item
        to="/admin/terms"
        prepend-icon="mdi-calendar-range"
        :active="isActive('/admin/terms')"
      >
        Academic Terms
      </v-list-item>

        <v-list-item
        to="/admin/periods"
        prepend-icon="mdi-book-clock-outline"
        :active="isActive('/admin/periods')"
      >
        Periods
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
