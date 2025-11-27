<template>
  <div>
    <h2 class="text-h5 mb-6">Admin Dashboard</h2>

    <!-- STAT CARDS -->
    <v-row dense>
      <v-col cols="12" md="4">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3" size="36">mdi-town-hall</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ totalDepartments }}</div>
              <div class="text-caption text-grey">Departments</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3" size="36">mdi-account-tie</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ totalDeans }}</div>
              <div class="text-caption text-grey">Deans</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3" size="36">mdi-account-group</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ totalFaculty }}</div>
              <div class="text-caption text-grey">Faculty Members</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- OPTIONAL: FUTURE AREA FOR GRAPHS -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card elevation="2" class="pa-4">
          <h3 class="text-h6 mb-4">System Overview</h3>
          <div class="text-grey">
            Add charts here later (Departments breakdown, Active faculty, etc.)
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useNuxtApp } from "#app";

definePageMeta({
  layout: "admin"
});

const { $supabase } = useNuxtApp();

// Counts
const totalDepartments = ref(0);
const totalDeans = ref(0);
const totalFaculty = ref(0);

onMounted(() => {
  loadCounts();
});

// Load dashboard metrics
async function loadCounts() {
  // Departments
  const { data: deptData } = await $supabase
    .from("departments")
    .select("id", { count: "exact" });
  totalDepartments.value = deptData?.length || 0;

  // Deans
  const { data: deanData } = await $supabase
    .from("deans")
    .select("id", { count: "exact" });
  totalDeans.value = deanData?.length || 0;

  // Faculty (excluding deans)
  const { data: facultyData } = await $supabase
    .from("users")
    .select("id")
    .eq("role", "FACULTY");
  totalFaculty.value = facultyData?.length || 0;
}
</script>
