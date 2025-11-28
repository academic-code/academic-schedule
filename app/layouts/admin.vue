<template>
  <v-app>
    <!-- Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      app
      width="260"
      elevation="1"
      color="white"
    >
      <div class="pa-4 d-flex justify-center">
        <v-img src="/Logo.png" width="60" />
      </div>

      <v-list nav density="compact">
        <v-list-item
          v-for="item in menu"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.label"
          rounded="lg"
          active-class="nav-active"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Top Bar -->
    <v-app-bar app color="white" elevation="1">
      <v-btn icon variant="text" @click="drawer = !drawer">
        <v-icon color="primary">mdi-menu</v-icon>
      </v-btn>

      <v-spacer />

      <div class="mr-4 text-subtitle-2 font-weight-medium">
        Admin Panel
      </div>

      <!-- PROFILE / LOGOUT MENU -->
      <v-menu>
        <template #activator="{ props }">
          <v-btn icon variant="text" v-bind="props">
            <v-icon color="primary">mdi-account-circle</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item>
            <v-list-item-title class="text-caption">
              {{ currentUser?.email }}
              <br />
              ({{ currentRole }})
            </v-list-item-title>
          </v-list-item>

          <v-divider />

          <v-list-item @click="logout">
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="bg-grey-lighten-4">
      <div class="pa-6">
        <NuxtPage />
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { logoutUser, currentUser, currentRole } from "~/composables/useUser";

const router = useRouter();
const drawer = ref(true);

const menu = [
  { label: "Dashboard", to: "/admin/dashboard", icon: "mdi-view-dashboard" },
  { label: "Departments", to: "/admin/departments", icon: "mdi-town-hall" },
  { label: "Deans", to: "/admin/deans", icon: "mdi-account-tie" },
];

async function logout() {
  await logoutUser();
  router.push("/login");
}
</script>

<style scoped>
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}
</style>
