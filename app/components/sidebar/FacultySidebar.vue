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
      <v-list-subheader>Faculty</v-list-subheader>

      <v-list-item
        to="/faculty/schedule"
        prepend-icon="mdi-calendar"
        :active="isActive('/faculty/schedule')"
      >
        My Schedule
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
