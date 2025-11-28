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
          v-for="item in visibleMenu"
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
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useSupabase } from "~/composables/useSupabase";
import { currentUser, currentRole, loadUser, logoutUser } from "~/composables/useUser";

const router = useRouter();
const supabase = useSupabase();

const drawer = ref(true);
const userEmail = ref("");
const userRole = ref("DEAN");
const departmentName = ref("Loading...");
const departmentType = ref("NORMAL"); // "NORMAL" or "GENED"

// MASTER MENU (Filters dynamically based on department type)
const menu = [
  { label: "Dashboard", to: "/dean/dashboard", icon: "mdi-view-dashboard", all: true },
  { label: "Faculty", to: "/dean/faculty", icon: "mdi-account-tie", gened: false },
  { label: "Classes", to: "/dean/classes", icon: "mdi-account-group", gened: false },
  { label: "Subjects", to: "/dean/subjects", icon: "mdi-book-open-variant", gened: false },
  { label: "GenEd Subjects", to: "/dean/gened-subjects", icon: "mdi-book-education", gened: true },
  { label: "Schedules", to: "/dean/schedule-builder", icon: "mdi-calendar-clock", gened: false },
  { label: "Generate Periods", to: "/dean/generate-periods", icon: "mdi-timer-cog", all: true },
  { label: "Upload Subjects CSV", to: "/dean/subjects-upload", icon: "mdi-file-upload", gened: false },
];

// Visible menu depends on department type
const visibleMenu = computed(() => {
  if (departmentType.value === "GENED") {
    // GENED DEAN SEES ONLY GENED-SUBJECTS, DASHBOARD, PERIODS
    return menu.filter((m) => m.gened === true || m.all === true);
  } else {
    // NORMAL DEAN SEES ALL NON-GENED MENUS
    return menu.filter((m) => m.gened !== true);
  }
});

onMounted(async () => {
  await loadUser();

  // PROTECT LAYOUT
  if (!currentUser.value || currentRole.value !== "DEAN") {
    return router.push("/login");
  }

  userEmail.value = currentUser.value.email || "";

  // Load department information
  const departmentId = currentUser.value?.user_metadata?.department_id;

  if (departmentId) {
    const { data } = await supabase
      .from("departments")
      .select("name, type")
      .eq("id", departmentId)
      .single();

    departmentName.value = data?.name || "Department";
    departmentType.value = data?.type || "NORMAL";

    const currentPath = router.currentRoute.value.path;

    // ------------------------------------------------
    // AUTO-REDIRECT BASED ON DEPARTMENT TYPE
    // ------------------------------------------------
    if (departmentType.value === "GENED") {
      // Redirect any dean page to gened subjects
      if (currentPath !== "/dean/gened-subjects") {
        return router.replace("/dean/gened-subjects");
      }
    } else {
      // NORMAL DEAN
      if (currentPath === "/dean" || currentPath === "/dean/") {
        return router.replace("/dean/subjects");
      }
      if (currentPath === "/dean/gened-subjects") {
        return router.replace("/dean/subjects");
      }
    }
  }
});

// LOGOUT
async function logoutNow() {
  await logoutUser();
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
