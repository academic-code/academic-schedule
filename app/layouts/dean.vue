<template>
  <v-app>

    <!-- SIDEBAR -->
    <v-navigation-drawer
      v-model="drawer"
      app
      width="260"
      elevation="1"
      color="white"
    >
      <div class="pa-4 d-flex flex-column align-center">
        <v-img src="/logo.png" width="700" class="mb-3" />

        <div class="text-subtitle-2 font-weight-medium text-center">
          {{ departmentName }}
        </div>

        <div class="text-caption text-grey text-center">
          {{ userEmail }}
        </div>
      </div>

      <v-divider></v-divider>

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

    <!-- TOP BAR -->
    <v-app-bar app color="white" elevation="1">
      <v-btn icon variant="text" @click="drawer = !drawer">
        <v-icon color="primary">mdi-menu</v-icon>
      </v-btn>

      <v-spacer />

      <!-- Profile menu -->
      <v-menu>
        <template #activator="{ props }">
          <v-btn icon variant="text" v-bind="props">
            <v-icon color="primary">mdi-account-circle</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item disabled>
            <v-list-item-title>{{ userEmail }}</v-list-item-title>
            <v-list-item-subtitle>{{ userRole }}</v-list-item-subtitle>
          </v-list-item>

          <v-divider class="my-1"></v-divider>

          <v-list-item @click="logoutNow">
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- MAIN CONTENT -->
    <v-main class="bg-grey-lighten-4">
      <div class="pa-6">
        <NuxtPage />
      </div>
    </v-main>

  </v-app>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useSupabase } from "~/composables/useSupabase";
import { currentUser, currentRole, loadUser, logoutUser } from "~/composables/useUser";

const router = useRouter();
const supabase = useSupabase();

const drawer = ref(true);

const userEmail = ref("");
const userRole = ref("DEAN");
const departmentName = ref("Loading...");

// Sidebar menu items
const menu = [
  { label: "Dashboard", to: "/dean/dashboard", icon: "mdi-view-dashboard" },
  { label: "Faculty", to: "/dean/faculty", icon: "mdi-account-tie" },
  { label: "Classes", to: "/dean/classes", icon: "mdi-account-group" },
  { label: "Subjects", to: "/dean/subjects", icon: "mdi-book-open-variant" },
  { label: "Schedules", to: "/dean/schedule-builder", icon: "mdi-calendar-clock" },
  { label: "Generate Periods", to: "/dean/generate-periods", icon: "mdi-timer-cog" },
  { label: "Upload Subjects CSV", to: "/dean/subjects-upload", icon: "mdi-file-upload" },
];

onMounted(async () => {
  await loadUser();

  // Protect layout: only DEAN should access
  if (!currentUser.value || currentRole.value !== "DEAN") {
    return router.push("/login");
  }

  userEmail.value = currentUser.value.email || "";
  userRole.value = "DEAN";

  const departmentId = currentUser.value?.user_metadata?.department_id;

  if (departmentId) {
    const { data } = await supabase
      .from("departments")
      .select("name")
      .eq("id", departmentId)
      .single();

    departmentName.value = data?.name || "Department";
  }
});

// LOGOUT FUNCTION
async function logoutNow() {
  await logoutUser(); // Clears Supabase session + composable state
  router.push("/login");
}
</script>

<style scoped>
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}
.text-grey {
  color: #888 !important;
}
</style>
