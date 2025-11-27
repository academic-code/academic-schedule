<template>
  <v-app>
    <!-- Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      app
      width="260"
      color="white"
      elevation="1"
    >
      <!-- Logo Only -->
      <div class="pa-4 d-flex justify-center">
        <v-img src="/logo.png" width="60" height="60" />
      </div>

      <!-- Navigation Menu -->
      <v-list density="compact" nav>
        <v-list-item
          v-for="item in menu"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.label"
          rounded="lg"
          active-class="nav-active"
          :exact="true"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Top App Bar -->
    <v-app-bar app elevation="1" color="white">
      <!-- Hamburger Icon -->
      <v-btn icon variant="text" @click="drawer = !drawer">
        <v-icon color="primary">mdi-menu</v-icon>
      </v-btn>

      <v-spacer />

      <!-- Welcome user -->
      <div class="mr-4 text-subtitle-2 font-weight-medium">
        Welcome, {{ userName }}
      </div>

      <!-- Account Dropdown -->
      <v-menu>
        <template #activator="{ props }">
          <v-btn icon v-bind="props" variant="text">
            <v-icon color="primary">mdi-account-circle</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item @click="goToProfile">
            <v-list-item-title>Profile</v-list-item-title>
          </v-list-item>

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

const router = useRouter();
const drawer = ref(true);

// We will replace with real Supabase user in Step 7
const userName = "Administrator";

const menu = [
  { label: "Dashboard", to: "/", icon: "mdi-view-dashboard" },
  { label: "Periods", to: "/periods", icon: "mdi-clock-outline" },
  { label: "Subjects", to: "/subjects", icon: "mdi-book-open-variant" },
  { label: "Teachers", to: "/teachers", icon: "mdi-account-group" },
  { label: "Classes", to: "/classes", icon: "mdi-google-classroom" },
  { label: "Schedules", to: "/schedules", icon: "mdi-calendar-month" },
];

function goToProfile() {
  router.push("/profile");
}

function logout() {
  console.log("TODO: Supabase logout");
}
</script>

<style scoped>
/* Active navigation highlight */
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}

.v-navigation-drawer {
  border-right: 1px solid #e0e0e0 !important;
}
</style>
