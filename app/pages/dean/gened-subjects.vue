<template>
  <div>
    <h2 class="text-h5 mb-4">General Education Subjects</h2>

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

        <!-- DEPARTMENT FILTER -->
        <v-col cols="12" md="3">
          <v-select
            v-model="filterDept"
            :items="deptOptions"
            item-title="label"
            item-value="id"
            label="Department"
            clearable
            density="comfortable"
          />
        </v-col>

        <!-- YEAR LEVEL -->
        <v-col cols="12" md="2">
          <v-select
            v-model="filterYear"
            :items="yearLevelOptions"
            item-title="label"
            item-value="value"
            label="Year Level"
            density="comfortable"
          />
        </v-col>

        <!-- SEMESTER -->
        <v-col cols="12" md="2">
          <v-select
            v-model="filterSemester"
            :items="semesterOptions"
            label="Semester"
            density="comfortable"
          />
        </v-col>

        <!-- SEARCH -->
        <v-col cols="12" md="3">
          <v-text-field
            v-model="search"
            label="Search..."
            prepend-inner-icon="mdi-magnify"
            clearable
            density="comfortable"
          />
        </v-col>

        <!-- ADD BUTTON -->
        <v-col cols="12" md="2" class="d-flex align-center">
          <v-btn color="primary" block class="ml-auto" @click="openCreateModal">
            <v-icon left>mdi-plus</v-icon>
            Add GenEd
          </v-btn>
        </v-col>

      </v-row>
    </v-card>

    <!-- TABLE -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredSubjects"
        :loading="loading"
        density="comfortable"
      >
        <template #item.units="{ item }">
          {{ item.lec + item.lab }}
        </template>

        <template #item.department_name="{ item }">
          {{ item.department_name }}
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

    <!-- MODAL -->
    <v-dialog v-model="showModal" max-width="820">
      <v-card>
        <v-card-title class="text-h6">
          {{ isEditMode ? "Edit GenEd Subject" : "Create GenEd Subject" }}
        </v-card-title>

        <v-card-text>
          <v-row dense>

            <v-col cols="12" md="6">
              <v-text-field v-model="form.course_code" label="Course Code" />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field v-model="form.description" label="Description" />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field type="number" v-model.number="form.lec" label="Lecture Hours (lec)" />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field type="number" v-model.number="form.lab" label="Lab Hours (lab)" />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field :value="computedUnits" readonly label="Units (lec + lab)" />
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

            <!-- LOCKED DEPARTMENT IN EDIT -->
            <v-col cols="12" md="4">
              <v-select
                v-model="form.department_id"
                :items="deptOptions"
                item-title="label"
                item-value="id"
                label="Department"
                :disabled="isEditMode"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="form.curriculum_year"
                :items="curriculumYearOptions"
                label="Curriculum Year"
              />
            </v-col>

            <!-- PREREQUISITES -->
            <v-col cols="12">
              <v-select
                v-model="form.prerequisites"
                :items="prereqOptions"
                item-title="label"
                item-value="id"
                label="Prerequisites"
                multiple
                chips
                clearable
                @update:modelValue="handlePrereq"
              />
            </v-col>

          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showModal = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveSubject" :loading="saving">Save</v-btn>
        </v-card-actions>

      </v-card>
    </v-dialog>

    <!-- DELETE -->
    <v-dialog v-model="showDeleteDialog" max-width="480">
      <v-card>
        <v-card-title class="text-h6">Delete Subject?</v-card-title>
        <v-card-text>
          Delete <strong>{{ deleteInfo?.course_code }}</strong> ?
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
import { ref, computed, onMounted, watch } from "vue";
import { useSupabase } from "~/composables/useSupabase";
import { loadUser, currentUser } from "~/composables/useUser";

definePageMeta({ layout: "dean" });

/* state */
const supabase = useSupabase();
const loading = ref(false);
const saving = ref(false);

const subjects = ref([]);
const departments = ref([]);
const prereqList = ref([]);

const showModal = ref(false);
const showDeleteDialog = ref(false);
const deleteInfo = ref(null);

const alertMessage = ref("");
const alertType = ref("success");

function showAlert(m, t = "success") {
  alertMessage.value = m;
  alertType.value = t;
  setTimeout(() => (alertMessage.value = ""), 2500);
}

/* FILTERS */
const filterDept = ref(null);
const filterYear = ref("ALL");
const filterSemester = ref("ALL");
const search = ref("");

/* FORM MODEL */
const form = ref({
  id: null,
  course_code: "",
  description: "",
  lec: 0,
  lab: 0,
  year_level_number: 1,
  semester: "1",
  curriculum_year: "",
  department_id: null,
  prerequisites: [],
  is_gened: true,
});

const isEditMode = computed(() => !!form.value.id);

/* OPTIONS */
const yearLevelLabel = {
  1: "1st Year",
  2: "2nd Year",
  3: "3rd Year",
  4: "4th Year",
};

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

const curriculumYearOptions = Array.from({ length: 2030 - 2014 + 1 }, (_, i) =>
  `${2014 + i}-${2015 + i}`
);

const deptOptions = computed(() =>
  departments.value.map((d) => ({ id: d.id, label: d.name }))
);

const prereqOptions = computed(() => [
  { id: "NONE", label: "None" },
  ...prereqList.value,
]);

/* LOADERS */
onMounted(async () => {
  loading.value = true;
  await loadUser();
  await loadDepartments();
  await loadPrereqs();
  await loadSubjects();
  loading.value = false;
});

watch([filterDept, filterYear, filterSemester, search], loadSubjects);

/* FUNCTIONS */
async function loadDepartments() {
  const { data } = await supabase.from("departments").select("id,name").order("name");
  departments.value = data || [];
}

async function loadPrereqs() {
  const { data } = await supabase
    .from("subjects")
    .select("id,course_code,description")
    .order("course_code");

  prereqList.value =
    data?.map((s) => ({
      id: s.id,
      label: `${s.course_code} — ${s.description}`,
    })) || [];
}

async function loadSubjects() {
  loading.value = true;

  let q = supabase.from("subjects").select("*").eq("is_gened", true);

  if (filterDept.value) q = q.eq("department_id", filterDept.value);
  if (filterYear.value !== "ALL") q = q.eq("year_level_number", filterYear.value);
  if (filterSemester.value !== "ALL") q = q.eq("semester", filterSemester.value);

  const { data } = await q.order("course_code");

  const deptMap = new Map(departments.value.map((d) => [d.id, d.name]));

  subjects.value =
    data?.map((s) => ({
      ...s,
      units: Number(s.lec || 0) + Number(s.lab || 0),
      department_name: deptMap.get(s.department_id) || "",
    })) || [];

  if (search.value.trim()) {
    const term = search.value.toLowerCase();
    subjects.value = subjects.value.filter((s) =>
      `${s.course_code} ${s.description}`.toLowerCase().includes(term)
    );
  }

  loading.value = false;
}

const filteredSubjects = computed(() => subjects.value);

function openCreateModal() {
  form.value = {
    id: null,
    course_code: "",
    description: "",
    lec: 0,
    lab: 0,
    year_level_number: filterYear.value === "ALL" ? 1 : filterYear.value,
    semester: filterSemester.value === "ALL" ? "1" : filterSemester.value,
    curriculum_year: "",
    department_id: filterDept.value || null,
    prerequisites: [],
    is_gened: true,
  };
  showModal.value = true;
}

function editSubject(s) {
  form.value = {
    id: s.id,
    course_code: s.course_code,
    description: s.description,
    lec: s.lec,
    lab: s.lab,
    year_level_number: s.year_level_number,
    semester: s.semester,
    curriculum_year: s.curriculum_year || "",
    department_id: s.department_id,
    prerequisites: s.prerequisites || [],
    is_gened: true,
  };
  showModal.value = true;
}

function handlePrereq(v) {
  if (v.includes("NONE")) form.value.prerequisites = ["NONE"];
}

const computedUnits = computed(
  () => Number(form.value.lec || 0) + Number(form.value.lab || 0)
);

async function saveSubject() {
  if (!form.value.course_code || !form.value.description)
    return showAlert("Course code & description required", "error");

  if (!form.value.department_id)
    return showAlert("Choose a department", "error");

  saving.value = true;

  const payload = {
    ...form.value,
    units: computedUnits.value,
    year_level_label: yearLevelLabel[form.value.year_level_number],
    is_gened: true,
    prerequisites:
      form.value.prerequisites.length === 0
        ? ["NONE"]
        : form.value.prerequisites,
  };

  let error;

  if (!isEditMode.value) {
    const existing = await supabase
      .from("subjects")
      .select("id")
      .eq("course_code", payload.course_code)
      .eq("department_id", payload.department_id)
      .limit(1);

    if (existing.data?.length)
      return showAlert("Course already exists in this department", "error");

    const res = await supabase.from("subjects").insert(payload);
    error = res.error;
  } else {
    const res = await supabase
      .from("subjects")
      .update(payload)
      .eq("id", form.value.id);
    error = res.error;
  }

  saving.value = false;

  if (error) return showAlert(error.message, "error");

  showModal.value = false;
  showAlert("Saved successfully");
  loadSubjects();
  loadPrereqs();
}

function confirmDelete(s) {
  deleteInfo.value = s;
  showDeleteDialog.value = true;
}

async function deleteSubjectNow() {
  const res = await supabase.from("subjects").delete().eq("id", deleteInfo.value.id);
  if (res.error) return showAlert("Delete failed", "error");

  showDeleteDialog.value = false;
  showAlert("Deleted");

  loadSubjects();
}
</script>



<style scoped>
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}
</style>
