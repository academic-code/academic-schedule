<template>
  <div>

    <!-- HEADER -->
    <div class="d-flex justify-space-between align-center mb-6">
      <h2 class="text-h5">Dean Dashboard</h2>
    </div>

    <!-- STATS CARDS -->
    <v-row dense>
      <v-col cols="12" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3" size="36">mdi-town-hall</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ facultyCount }}</div>
              <div class="text-caption text-grey">Faculty Members</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3" size="36">mdi-book-open-variant</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ subjectCount }}</div>
              <div class="text-caption text-grey">Subjects</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3" size="36">mdi-account-group</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ classCount }}</div>
              <div class="text-caption text-grey">Classes</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3" size="36">mdi-calendar-clock</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ scheduleCount }}</div>
              <div class="text-caption text-grey">Schedules</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- QUICK ACTIONS -->
    <h3 class="text-h6 mt-8 mb-4">Quick Actions</h3>

    <v-row dense>
      <v-col cols="12" md="3">
        <v-card class="pa-4 action-card" @click="navigate('/dean/faculty')">
          <v-icon size="40" color="primary">mdi-account-plus</v-icon>
          <div class="action-title">Add Faculty</div>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="pa-4 action-card" @click="navigate('/dean/classes')">
          <v-icon size="40" color="primary">mdi-account-multiple-plus</v-icon>
          <div class="action-title">Add Class</div>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="pa-4 action-card" @click="navigate('/dean/generate-periods')">
          <v-icon size="40" color="primary">mdi-timer-cog</v-icon>
          <div class="action-title">Generate Time Periods</div>
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="pa-4 action-card" @click="navigate('/dean/subjects-upload')">
          <v-icon size="40" color="primary">mdi-file-upload</v-icon>
          <div class="action-title">Upload Subjects CSV</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- SYSTEM NOTES / ANNOUNCEMENTS -->
    <v-card elevation="2" class="pa-4 mt-8">
      <h3 class="text-h6 mb-3">Department Overview</h3>
      <div class="text-grey">
        Your department: <strong>{{ departmentName }}</strong>  
        <br />
        You can now manage classes, faculty, schedules, and subjects for this department.
      </div>
    </v-card>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { currentUser, currentRole, loadUser } from "~/composables/useUser";
import { useRouter } from "vue-router";

definePageMeta({
  layout: "dean"
});

const router = useRouter();
const supabase = useSupabase();

// USER INFO
const userEmail = ref("");
const userRole = ref("");
const departmentName = ref("");

// STATS
const facultyCount = ref(0);
const classCount = ref(0);
const subjectCount = ref(0);
const scheduleCount = ref(0);

onMounted(async () => {
  await loadUser();

  userEmail.value = currentUser.value?.email ?? "";
  userRole.value = currentRole.value ?? "";

  const departmentId = currentUser.value?.user_metadata?.department_id;

  if (!departmentId) return;

  await loadDepartment(departmentId);
  await loadCounts(departmentId);
});

/* LOAD DEPARTMENT NAME */
async function loadDepartment(deptId) {
  const { data } = await supabase
    .from("departments")
    .select("name")
    .eq("id", deptId)
    .single();

  departmentName.value = data?.name ?? "Unknown Department";
}

/* LOAD METRICS */
async function loadCounts(deptId) {
  // Faculty
  const { data: faculty } = await supabase
    .from("users")
    .select("id")
    .eq("department_id", deptId)
    .eq("role", "FACULTY");
  facultyCount.value = faculty?.length ?? 0;

  // Classes
  const { data: classes } = await supabase
    .from("classes")
    .select("id")
    .eq("department_id", deptId);
  classCount.value = classes?.length ?? 0;

  // Subjects (major only)
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id")
    .eq("department_id", deptId);
  subjectCount.value = subjects?.length ?? 0;

  // Schedules
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id")
    .eq("department_id", deptId);
  scheduleCount.value = schedules?.length ?? 0;
}

/* QUICK NAV */
function navigate(path) {
  router.push(path);
}
</script>

<style scoped>
.action-card {
  cursor: pointer;
  transition: 0.2s;
  text-align: center;
}

.action-card:hover {
  background: #f3f7ff;
}

.action-title {
  margin-top: 8px;
  font-weight: 600;
  color: #2563eb;
}
</style>
