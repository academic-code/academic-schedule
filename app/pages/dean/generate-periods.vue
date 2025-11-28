<template>
  <div>
    <h2 class="text-h5 mb-4">Generate Standard Time Periods</h2>

    <!-- ALERT -->
    <v-alert
      v-if="alertMessage"
      :type="alertType"
      class="mb-4"
      border="start"
      @click:close="alertMessage = ''"
    >
      {{ alertMessage }}
    </v-alert>

    <!-- INFO CARD -->
    <v-card class="pa-4 mb-6" elevation="2">
      <p class="text-body-2">
        This tool generates the standard 30-minute time periods from 
        <strong>7:00 AM</strong> to <strong>9:00 PM</strong>.
      </p>

      <p class="text-body-2 mt-2">
        Your department currently has:
        <strong>{{ existingCount }}</strong> period(s).
      </p>
    </v-card>

    <!-- ACTION BUTTONS -->
    <v-row>
      <v-col cols="12" md="6">
        <v-btn color="primary" block :loading="loading" @click="generateMissing">
          Generate Missing Periods Only
        </v-btn>
      </v-col>

      <v-col cols="12" md="6">
        <v-btn color="red" block :loading="loading" @click="replaceAll">
          Replace All Periods (Danger)
        </v-btn>
      </v-col>
    </v-row>

    <!-- PERIOD LIST -->
    <v-card class="pa-4 mt-6" elevation="2">
      <h3 class="text-h6 mb-3">Current Periods</h3>

      <div v-if="periods.length === 0" class="text-grey">
        No periods generated yet.
      </div>

      <!-- DATA TABLE -->
      <v-data-table
        v-else
        :headers="headers"
        :items="formattedPeriods"
        class="elevation-1"
        density="compact"
      ></v-data-table>
    </v-card>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { currentUser, loadUser } from "~/composables/useUser";

definePageMeta({ layout: "dean" });

const supabase = useSupabase();

/* UI STATE */
const loading = ref(false);
const periods = ref([]);
const existingCount = ref(0);

const alertMessage = ref("");
const alertType = ref("success");

function showAlert(msg, type = "success") {
  alertMessage.value = msg;
  alertType.value = type;
  setTimeout(() => (alertMessage.value = ""), 2000);
}

/* UTIL — convert 24h -> 12h */
function to12Hour(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* UTIL — force HH:MM:SS format */
function format(h, m) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/* GENERATE STANDARD PERIODS */
function generateStandardPeriods() {
  const result = [];
  let hour = 7;
  let minute = 0;
  let index = 1;

  while (hour < 21) {
    const start = format(hour, minute);

    minute += 30;
    if (minute === 60) {
      minute = 0;
      hour++;
    }

    const end = format(hour, minute);

    result.push({
      start_time: start,
      end_time: end,
      slot_index: index++,
      is_auto_generated: true,
    });
  }

  return result;
}

/* LOAD EXISTING PERIODS */
async function loadPeriods() {
  await loadUser();
  const deptId = currentUser.value?.user_metadata?.department_id;

  const { data } = await supabase
    .from("periods")
    .select("*")
    .eq("department_id", deptId)
    .order("slot_index");

  periods.value = data || [];
  existingCount.value = periods.value.length;
}

/* TABLE HEADERS */
const headers = [
  { title: "Slot #", key: "slot_index", width: 60 },
  { title: "Start Time", key: "start" },
  { title: "End Time", key: "end" },
];

/* TABLE ITEMS */
const formattedPeriods = computed(() =>
  periods.value.map((p) => ({
    slot_index: p.slot_index,
    start: to12Hour(p.start_time),
    end: to12Hour(p.end_time),
  }))
);

/* GENERATE — Missing Only */
async function generateMissing() {
  loading.value = true;
  await loadUser();

  const deptId = currentUser.value?.user_metadata?.department_id;
  const standard = generateStandardPeriods();

  const { data: existing } = await supabase
    .from("periods")
    .select("slot_index")
    .eq("department_id", deptId);

  const existingSet = new Set(existing.map((p) => p.slot_index));

  const missing = standard
    .filter((s) => !existingSet.has(s.slot_index))
    .map((s) => ({ ...s, department_id: deptId }));

  if (missing.length === 0) {
    showAlert("All periods already exist!", "info");
    loading.value = false;
    return;
  }

  const { error } = await supabase.from("periods").insert(missing);

  if (error) showAlert("Failed: RLS blocked insert", "error");
  else showAlert("Missing periods added!", "success");

  await loadPeriods();
  loading.value = false;
}

/* REPLACE ALL */
async function replaceAll() {
  if (!confirm("This will DELETE all existing periods. Continue?")) return;

  loading.value = true;
  await loadUser();

  const deptId = currentUser.value?.user_metadata?.department_id;

  await supabase.from("periods").delete().eq("department_id", deptId);

  const rows = generateStandardPeriods().map((p) => ({
    ...p,
    department_id: deptId,
  }));

  const { error } = await supabase.from("periods").insert(rows);

  if (error) showAlert("Failed to regenerate periods", "error");
  else showAlert("All periods replaced successfully!", "success");

  await loadPeriods();
  loading.value = false;
}

onMounted(() => loadPeriods());
</script>

<style scoped>
.text-grey {
  color: #777;
}
</style>
