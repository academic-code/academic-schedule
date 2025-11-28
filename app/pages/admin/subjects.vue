<template>
  <div>
    <h2 class="text-h5 mb-4">Subjects — Admin</h2>

    <v-alert
      v-if="alertMessage"
      :type="alertType"
      class="mb-4"
      closable
      @click:close="alertMessage = ''"
    >
      {{ alertMessage }}
    </v-alert>

    <div class="d-flex align-center mb-4 gap-3">
      <v-select
        v-model="selectedYear"
        :items="yearLevels"
        item-title="label"
        item-value="value"
        label="Year Level"
        :return-object="false"
        dense
        style="max-width: 220px"
      />
      <v-select
        v-model="selectedSemester"
        :items="semesterOptions"
        item-title="label"
        item-value="value"
        label="Semester"
        :return-object="false"
        dense
        style="max-width: 220px"
      />
      <v-select
        v-model="filterDept"
        :items="deptSelectOptions"
        item-title="label"
        item-value="id"
        label="Department"
        :return-object="false"
        dense
        style="max-width: 300px"
        clearable
      />
      <v-spacer />
      <!-- Admin cannot create -->
    </div>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredSubjects"
        :loading="loading"
        item-key="id"
        density="comfortable"
      >
        <template #item.units="{ item }">
          {{ item.units ?? (Number(item.lec || 0) + Number(item.lab || 0)) }}
        </template>

        <template #item.is_gened="{ item }">
          <v-chip small color="green" text-color="white" v-if="item.is_gened">GENED</v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn icon size="small" @click="editSubject(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" color="red" @click="confirmDelete(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- EDIT Modal (Admin can edit & delete but not create) -->
    <v-dialog v-model="showModal" max-width="760">
      <v-card>
        <v-card-title>
          <span class="text-h6">Edit Subject</span>
        </v-card-title>

        <v-card-text>
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.course_code" label="Course Code" />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field v-model="form.description" label="Title / Description" />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field v-model.number="form.lec" label="Lecture Hours (lec)" type="number" min="0" />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field v-model.number="form.lab" label="Lab Hours (lab)" type="number" min="0" />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field :value="computedUnits" label="Units (lec + lab)" readonly />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.year_level_number"
                :items="yearLevels"
                item-title="label"
                item-value="value"
                label="Year Level"
                :return-object="false"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.semester"
                :items="semesterOptions"
                item-title="label"
                item-value="value"
                label="Semester"
                :return-object="false"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.department_id"
                :items="deptSelectOptions"
                item-title="label"
                item-value="id"
                label="Department"
                :return-object="false"
              />
            </v-col>

            <v-col cols="12">
              <v-autocomplete
                v-model="form.prerequisites"
                :items="prereqOptionsWithNone"
                item-title="label"
                item-value="id"
                label="Prerequisites (select multiple)"
                multiple
                chips
                clearable
                :return-object="false"
                @update:modelValue="onPrereqChanged"
              />
            </v-col>

            <v-col cols="12">
              <v-text-field v-model="form.curriculum_year" label="Curriculum Year (optional)" />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeModal">Cancel</v-btn>
          <v-btn color="primary" @click="saveSubject" :loading="saving">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm -->
    <v-dialog v-model="showDeleteDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6">Delete Subject?</v-card-title>
        <v-card-text>
          Delete <strong>{{ deleteInfo?.course_code }} — {{ deleteInfo?.description }}</strong>?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="red" @click="deleteSubjectNow">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { currentUser, loadUser } from "~/composables/useUser";

definePageMeta({ layout: "admin" });

const supabase = useSupabase();

/* state */
const loading = ref(false);
const saving = ref(false);
const subjects = ref([]);
const departments = ref([]);
const prereqOptions = ref([]);

const alertMessage = ref("");
const alertType = ref("success");

function showAlert(msg, type = "success") {
  alertMessage.value = msg;
  alertType.value = type;
  setTimeout(() => (alertMessage.value = ""), 3000);
}

/* modal / form */
const showModal = ref(false);
const showDeleteDialog = ref(false);
const deleteInfo = ref(null);

const form = ref({
  id: null,
  course_code: "",
  description: "",
  lec: 0,
  lab: 0,
  year_level_number: 1,
  semester: "1",
  curriculum_year: "",
  is_gened: false,
  department_id: null,
  prerequisites: [],
});

/* filters */
const selectedYear = ref(1);
const selectedSemester = ref("1");
const filterDept = ref(null);

/* static options */
const yearLevels = [
  { label: "1st Year", value: 1 },
  { label: "2nd Year", value: 2 },
  { label: "3rd Year", value: 3 },
  { label: "4th Year", value: 4 },
];

const semesterOptions = [
  { label: "1st Semester", value: "1" },
  { label: "2nd Semester", value: "2" },
  { label: "Summer", value: "Summer" },
];

const headers = [
  { title: "Code", key: "course_code" },
  { title: "Title", key: "description" },
  { title: "Units", key: "units" },
  { title: "Lec", key: "lec" },
  { title: "Lab", key: "lab" },
  { title: "Year", key: "year_level_number" },
  { title: "Semester", key: "semester" },
  { title: "Dept", key: "department_name" },
  { title: "Type", key: "is_gened" },
  { title: "Actions", key: "actions", sortable: false },
];

/* computed */
const computedUnits = computed(() => Number(form.value.lec || 0) + Number(form.value.lab || 0));

const deptSelectOptions = computed(() => (departments.value || []).map((d) => ({ id: d.id, label: d.name })));

const prereqOptionsWithNone = computed(() => [{ id: "NONE", label: "None" }, ...prereqOptions.value]);

/* load helpers */
async function loadAll() {
  loading.value = true;
  await loadUser();
  await loadDepartments();
  await loadSubjects();
  await loadPrereqs();
  loading.value = false;
}

async function loadDepartments() {
  const { data } = await supabase.from("departments").select("*").order("name");
  departments.value = data || [];
}

async function loadPrereqs() {
  const { data } = await supabase.from("subjects").select("id, course_code, description").order("course_code");
  prereqOptions.value = (data || []).map((s) => ({ id: s.id, label: `${s.course_code} — ${s.description}` }));
}

/* load subjects (admin sees all) */
async function loadSubjects() {
  const { data, error } = await supabase
    .from("subjects")
    .select(
      `id, course_code, description, lec, lab, units, year_level_number, semester, curriculum_year, is_gened, department_id, prerequisites`
    )
    .order("course_code");

  if (error) {
    showAlert("Failed to load subjects", "error");
    subjects.value = [];
    return;
  }

  const deptMap = new Map((departments.value || []).map((d) => [d.id, d.name]));
  subjects.value = (data || []).map((s) => ({
    ...s,
    units: s.units ?? Number(s.lec || 0) + Number(s.lab || 0),
    department_name: deptMap.get(s.department_id) || "",
  }));
}

/* filtered */
const filteredSubjects = computed(() =>
  (subjects.value || []).filter((s) => {
    if (filterDept.value && s.department_id !== filterDept.value) return false;
    if (selectedYear.value && Number(s.year_level_number) !== Number(selectedYear.value)) return false;
    if (selectedSemester.value && String(s.semester) !== String(selectedSemester.value)) return false;
    return true;
  })
);

/* modal helpers */
function resetForm() {
  form.value = {
    id: null,
    course_code: "",
    description: "",
    lec: 0,
    lab: 0,
    year_level_number: selectedYear.value || 1,
    semester: selectedSemester.value || "1",
    curriculum_year: "",
    is_gened: false,
    department_id: null,
    prerequisites: [],
  };
}

function editSubject(item) {
  form.value = {
    id: item.id,
    course_code: item.course_code,
    description: item.description,
    lec: item.lec ?? 0,
    lab: item.lab ?? 0,
    year_level_number: item.year_level_number,
    semester: item.semester,
    curriculum_year: item.curriculum_year,
    is_gened: !!item.is_gened,
    department_id: item.department_id,
    prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites : [],
  };
  showModal.value = true;
}

/* prerequisites change handler */
function onPrereqChanged(newVal) {
  if (!newVal || !newVal.length) {
    form.value.prerequisites = [];
    return;
  }
  if (newVal.includes("NONE")) {
    form.value.prerequisites = ["NONE"];
  } else {
    form.value.prerequisites = newVal.filter((v) => v !== "NONE");
  }
}

/* save update (admin only edits) */
async function saveSubject() {
  if (!form.value.id) {
    return showAlert("Admin cannot create subjects", "error");
  }

  saving.value = true;

  const payload = {
    course_code: form.value.course_code,
    description: form.value.description,
    lec: Number(form.value.lec || 0),
    lab: Number(form.value.lab || 0),
    units: Number(form.value.lec || 0) + Number(form.value.lab || 0),
    year_level_number: Number(form.value.year_level_number),
    semester: form.value.semester,
    curriculum_year: form.value.curriculum_year || null,
    is_gened: !!form.value.is_gened,
    department_id: form.value.department_id,
    prerequisites: form.value.prerequisites && form.value.prerequisites.length ? form.value.prerequisites : [],
  };

  const { error } = await supabase.from("subjects").update(payload).eq("id", form.value.id);
  if (error) {
    showAlert("Failed to update subject: " + error.message, "error");
    saving.value = false;
    return;
  }

  showAlert("Subject updated", "success");
  saving.value = false;
  showModal.value = false;
  await loadSubjects();
  await loadPrereqs();
}

/* delete */
function confirmDelete(item) {
  deleteInfo.value = item;
  showDeleteDialog.value = true;
}

async function deleteSubjectNow() {
  if (!deleteInfo.value?.id) return;
  const { error } = await supabase.from("subjects").delete().eq("id", deleteInfo.value.id);
  if (error) {
    showAlert("Failed to delete subject: " + error.message, "error");
    return;
  }
  showAlert("Subject deleted", "success");
  showDeleteDialog.value = false;
  await loadSubjects();
  await loadPrereqs();
}

/* init */
onMounted(() => loadAll());
</script>

<style scoped>
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}
</style>
