<template>
  <div>
    <h2 class="text-h5 mb-4">Deans</h2>

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

    <!-- ADD BUTTON -->
    <v-btn color="primary" class="mb-4" @click="openCreateModal">
      <v-icon left>mdi-plus</v-icon>
      Add Dean
    </v-btn>

    <!-- TABLE -->
    <v-card>
      <v-table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="dean in deansData" :key="dean.id">
            <td>{{ dean.full_name }}</td>
            <td>{{ dean.email }}</td>
            <td>{{ dean.department?.name }}</td>

            <td>
              <v-btn icon size="small" @click="editDean(dean)">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>

              <v-btn icon size="small" color="red" @click="deleteDean(dean.id)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- MODAL -->
    <v-dialog v-model="showModal" max-width="600">
      <v-card>
        <v-card-title>
          {{ form.id ? "Edit Dean" : "Create Dean" }}
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="form.full_name"
            label="Full Name"
            class="mb-4"
          />

          <v-text-field
            v-model="form.email"
            label="Email"
            type="email"
            class="mb-4"
          />

          <v-select
            v-model="form.department_id"
            label="Select Department"
            :items="availableDepartments"
            item-title="name"
            item-value="id"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeModal">Cancel</v-btn>
          <v-btn color="primary" @click="saveDean">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useNuxtApp } from "#app";

definePageMeta({
  layout: "admin",
});

const { $supabase } = useNuxtApp();

// STATE
const deansData = ref([]);
const departments = ref([]);
const showModal = ref(false);

const form = ref({
  id: null,
  email: "",
  full_name: "",
  department_id: null,
});

// ALERTS
const alertMessage = ref("");
const alertType = ref("success");

function showAlert(msg, type = "success") {
  alertMessage.value = msg;
  alertType.value = type;
}

// LOAD DATA
onMounted(() => {
  loadDeans();
  loadDepartments();
});

// LOAD DEPARTMENTS
async function loadDepartments() {
  const { data, error } = await $supabase.from("departments").select("*");

  if (error) return showAlert("Failed to load departments", "error");

  departments.value = data;
}

// LOAD DEANS WITH JOINS
async function loadDeans() {
  const { data, error } = await $supabase
    .from("deans")
    .select("id, user:users(*), department:departments(*)");

  if (error) return showAlert("Failed to load deans", "error");

  deansData.value = data.map((d) => ({
    id: d.id,
    email: d.user.email,
    full_name: d.user.full_name,
    department: d.department,
    department_id: d.department?.id,
    user_id: d.user?.id,
  }));
}

// FILTER DEPARTMENTS WITHOUT A DEAN
const availableDepartments = computed(() => {
  return departments.value.filter((dept) => {
    return !deansData.value.some(
      (dean) => dean.department_id === dept.id
    );
  });
});

// CREATE / EDIT MODAL
function openCreateModal() {
  form.value = {
    id: null,
    email: "",
    full_name: "",
    department_id: null,
  };
  showModal.value = true;
}

function editDean(dean) {
  form.value = {
    id: dean.id,
    email: dean.email,
    full_name: dean.full_name,
    department_id: dean.department_id,
  };
  showModal.value = true;
}

// SAVE DEAN (CREATE)
async function saveDean() {
  if (!form.value.email || !form.value.full_name || !form.value.department_id) {
    return showAlert("All fields are required!", "error");
  }

  // Prevent duplicate dean for same department
  if (
    deansData.value.some(
      (d) =>
        d.department_id === form.value.department_id &&
        d.id !== form.value.id
    )
  ) {
    return showAlert("This department already has a dean!", "error");
  }

  // CREATE dean via server API
  if (!form.value.id) {
    const response = await $fetch("/api/create-dean", {
      method: "POST",
      body: {
        email: form.value.email,
        full_name: form.value.full_name,
        department_id: form.value.department_id,
      },
    });

    if (response.error) {
      return showAlert(response.error, "error");
    }

    showAlert("Dean created successfully!", "success");
    closeModal();
    return loadDeans();
  }

  // UPDATE dean — optional (we can add this later)
  showAlert("Dean editing will be added soon.", "info");
}

async function deleteDean(id) {
  const { error } = await $supabase.from("deans").delete().eq("id", id);

  if (error) return showAlert("Failed to delete dean", "error");

  showAlert("Dean deleted successfully!", "success");
  loadDeans();
}

function closeModal() {
  showModal.value = false;
}
</script>


<style scoped>
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}
</style>
