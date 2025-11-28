<template>
  <div>
    <h2 class="text-h5 mb-4">Subjects — Dean</h2>

    <!-- ALERT -->
    <v-alert
      v-if="alertMessage"
      :type="alertType"
      class="mb-4"
      closable
      @click:close="alertMessage = ''"
    >
      {{ alertMessage }}
    </v-alert>

    <!-- FILTERS -->
    <v-card class="pa-4 mb-4" elevation="1">
      <v-row dense>
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedYearLevel"
            :items="yearLevelOptions"
            item-title="label"
            item-value="value"
            label="Year Level"
            density="comfortable"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-select
            v-model="selectedSemester"
            :items="semesterOptions"
            label="Semester"
            density="comfortable"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-text-field
            v-model="search"
            label="Search Subject"
            prepend-inner-icon="mdi-magnify"
            clearable
            density="comfortable"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-btn color="primary" block class="mt-1" @click="openCreateModal">
            <v-icon left>mdi-plus</v-icon>
            Add Subject
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- SUBJECTS TABLE -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredSubjects"
        :loading="loading"
        class="text-body-2"
      >
        <template #item.units="{ item }">
          {{ item.lec + item.lab }}
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

    <!-- CREATE / EDIT MODAL -->
    <v-dialog v-model="showModal" max-width="760">
      <v-card>
        <v-card-title class="text-h6">
          {{ form.id ? "Edit Subject" : "Create Subject" }}
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
              <v-text-field
                v-model.number="form.lec"
                type="number"
                label="Lecture Hours (lec)"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="form.lab"
                type="number"
                label="Lab Hours (lab)"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                :model-value="computedUnits"
                label="Units (lec + lab)"
                readonly
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.year_level_number"
                :items="yearLevelOptionsFiltered"
                item-title="label"
                item-value="value"
                label="Year Level"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.semester"
                :items="semesterOptionsFiltered"
                label="Semester"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.curriculum_year"
                :items="curriculumYearOptions"
                label="Curriculum Year"
              />
            </v-col>

            <!-- Is GENED -->
            <v-col cols="12" md="6">
              <v-checkbox
                v-model="form.is_gened"
                label="Is General Education (GenEd)"
              />
            </v-col>

            <!-- Prerequisites -->
            <v-col cols="12">
              <v-select
                v-model="form.prerequisites"
                :items="prerequisiteOptions"
                item-title="label"
                item-value="id"
                label="Prerequisites (select multiple)"
                multiple
                chips
                clearable
                @update:modelValue="handlePrerequisitesChange"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeModal">Cancel</v-btn>
          <v-btn color="primary" @click="saveSubject">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DELETE CONFIRMATION -->
    <v-dialog v-model="showDeleteDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6">Delete Subject?</v-card-title>

        <v-card-text>This action cannot be undone.</v-card-text>

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
import { ref, computed, onMounted, watch } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { currentUser, loadUser } from "~/composables/useUser";

definePageMeta({ layout: "dean" });

const supabase = useSupabase();

/* STATE */
const loading = ref(false);
const subjects = ref([]);
const prerequisiteOptions = ref([]);
const search = ref("");

const selectedYearLevel = ref("ALL");
const selectedSemester = ref("ALL");

const showModal = ref(false);
const showDeleteDialog = ref(false);
const deleteInfo = ref(null);

const alertMessage = ref("");
const alertType = ref("success");

function showAlert(msg, type = "success") {
  alertMessage.value = msg;
  alertType.value = type;
  setTimeout(() => (alertMessage.value = ""), 2500);
}

/* YEAR LEVEL LABEL MAP */
const yearLevelLabelMap = {
  1: "1st Year",
  2: "2nd Year",
  3: "3rd Year",
  4: "4th Year",
};

/* FILTER OPTIONS */
const yearLevelOptions = [
  { value: "ALL", label: "All Levels" },
  { value: 1, label: "1st Year" },
  { value: 2, label: "2nd Year" },
  { value: 3, label: "3rd Year" },
  { value: 4, label: "4th Year" },
];

const yearLevelOptionsFiltered = yearLevelOptions.slice(1);

const semesterOptions = ["ALL", "1", "2", "Summer"];
const semesterOptionsFiltered = ["1", "2", "Summer"];

/* CURRICULUM YEAR OPTIONS */
const curriculumYearOptions = [];
for (let year = 2014; year <= 2030; year++) {
  curriculumYearOptions.push(`${year}-${year + 1}`);
}

/* TABLE HEADERS */
const headers = [
  { title: "Code", key: "course_code" },
  { title: "Description", key: "description" },
  { title: "Lec", key: "lec" },
  { title: "Lab", key: "lab" },
  { title: "Units", key: "units" },
  { title: "Actions", key: "actions", sortable: false },
];

/* FORM */
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

/* COMPUTED UNITS */
const computedUnits = computed(() => {
  return Number(form.value.lec || 0) + Number(form.value.lab || 0);
});

/* HANDLE NONE FOR PREREQUISITES */
function handlePrerequisitesChange(value) {
  if (value.includes("NONE")) {
    form.value.prerequisites = ["NONE"];
  }
}

/* LOAD DATA */
onMounted(async () => {
  loading.value = true;
  await loadUser();

  form.value.department_id = currentUser.value?.user_metadata?.department_id;

  await loadSubjects();
  await loadPrerequisitesList();

  loading.value = false;
});

/* RELOAD ON FILTER CHANGE */
watch(selectedYearLevel, () => loadSubjects());
watch(selectedSemester, () => loadSubjects());
watch(search, () => loadSubjects());

async function loadSubjects() {
  loading.value = true;

  const deptId = currentUser.value?.user_metadata?.department_id;

  let query = supabase.from("subjects").select("*").eq("department_id", deptId);

  if (selectedYearLevel.value !== "ALL") {
    query = query.eq("year_level_number", selectedYearLevel.value);
  }

  if (selectedSemester.value !== "ALL") {
    query = query.eq("semester", selectedSemester.value);
  }

  const { data } = await query.order("course_code");
  subjects.value = data || [];

  loading.value = false;
}

/* LOAD SUBJECTS FOR PREREQUISITE DROPDOWN */
async function loadPrerequisitesList() {
  const deptId = currentUser.value?.user_metadata?.department_id;

  const { data } = await supabase
    .from("subjects")
    .select("id, course_code, description")
    .eq("department_id", deptId)
    .order("course_code");

  prerequisiteOptions.value = [
    { id: "NONE", label: "None" },
    ...data.map((s) => ({
      id: s.id,
      label: `${s.course_code} — ${s.description}`,
    })),
  ];
}

/* FILTERED SUBJECTS (search) */
const filteredSubjects = computed(() => {
  if (!search.value) return subjects.value;

  return subjects.value.filter((s) =>
    `${s.course_code} ${s.description}`
      .toLowerCase()
      .includes(search.value.toLowerCase())
  );
});

/* MODAL HANDLERS */
function openCreateModal() {
  form.value = {
    id: null,
    course_code: "",
    description: "",
    lec: 0,
    lab: 0,
    year_level_number: selectedYearLevel.value === "ALL" ? 1 : selectedYearLevel.value,
    semester: selectedSemester.value === "ALL" ? "1" : selectedSemester.value,
    curriculum_year: "",
    is_gened: false,
    department_id: currentUser.value?.user_metadata?.department_id,
    prerequisites: [],
  };

  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function editSubject(item) {
  form.value = { ...item };
  showModal.value = true;
}

/* SAVE SUBJECT */
async function saveSubject() {
  if (!form.value.course_code || !form.value.description) {
    return showAlert("Course code and description are required.", "error");
  }

  const payload = {
    course_code: form.value.course_code,
    description: form.value.description,
    lec: Number(form.value.lec || 0),
    lab: Number(form.value.lab || 0),
    units: computedUnits.value,
    year_level_number: Number(form.value.year_level_number),
    year_level_label: yearLevelLabelMap[Number(form.value.year_level_number)],
    semester: form.value.semester,
    curriculum_year: form.value.curriculum_year || null,
    is_gened: !!form.value.is_gened,
    department_id: form.value.department_id,
    prerequisites:
      form.value.prerequisites?.length > 0 ? form.value.prerequisites : ["NONE"],
    created_by: currentUser.value?.id || null,
  };

  let error;

  if (form.value.id === null) {
    const res = await supabase.from("subjects").insert(payload);
    error = res.error;
  } else {
    const res = await supabase
      .from("subjects")
      .update(payload)
      .eq("id", form.value.id);
    error = res.error;
  }

  if (error) return showAlert(error.message, "error");

  closeModal();
  showAlert("Subject saved successfully!");

  loadSubjects();
}

/* DELETE */
function confirmDelete(item) {
  deleteInfo.value = item;
  showDeleteDialog.value = true;
}

async function deleteSubjectNow() {
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", deleteInfo.value.id);

  if (error) return showAlert("Failed to delete subject", "error");

  showDeleteDialog.value = false;
  showAlert("Subject deleted.");

  loadSubjects();
}
</script>




<style scoped>
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}
</style>
