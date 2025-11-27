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

    <!-- DEANS TABLE -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="deansData"
        :loading="loading"
      >
        <template #item.actions="{ item }">
          <v-btn icon size="small" @click="editDean(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>

          <v-btn icon size="small" color="red" @click="confirmDelete(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- CREATE/EDIT MODAL -->
    <v-dialog v-model="showModal" max-width="600">
      <v-card>
        <v-card-title class="text-h6">
          {{ form.id ? "Edit Dean" : "Create Dean" }}
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="form.full_name"
            label="Full Name"
            class="mb-3"
          />

          <v-text-field
            v-model="form.email"
            :disabled="form.id !== null"
            label="Email"
            type="email"
            class="mb-3"
          />

          <v-select
            v-model="form.department_id"
            label="Department"
            :items="departmentOptions"
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

    <!-- DELETE CONFIRMATION -->
    <v-dialog v-model="showDeleteDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6">Delete Dean?</v-card-title>

        <v-card-text>
          This dean will be <strong>permanently removed</strong> including:
          <ul>
            <li>schedules</li>
            <li>schedule periods</li>
            <li>faculty</li>
            <li>subjects</li>
            <li>classes</li>
            <li>user account</li>
            <li>Supabase Auth account</li>
          </ul>
          <strong>This action cannot be undone.</strong>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="red" @click="deleteDeanNow">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue"
import { useNuxtApp } from "#app"

definePageMeta({ layout: "admin" })

const { $supabase } = useNuxtApp()

// UI States
const loading = ref(false)
const deansData = ref([])
const departments = ref([])

const showModal = ref(false)
const showDeleteDialog = ref(false)
const deleteInfo = ref(null)

// Alerts
const alertMessage = ref("")
const alertType = ref("success")

function showAlert(message, type = "success") {
  alertMessage.value = message
  alertType.value = type
}

// Form model
const form = ref({
  id: null,
  full_name: "",
  email: "",
  department_id: null,
  user_id: null,
  auth_user_id: null,
})

// Data table headers
const headers = [
  { title: "Name", key: "full_name" },
  { title: "Email", key: "email" },
  { title: "Department", key: "department_name" },
  { title: "Actions", key: "actions", sortable: false },
]

// Load data
onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  await loadDepartments()
  await loadDeans()
  loading.value = false
}

// Load departments
async function loadDepartments() {
  const { data } = await $supabase.from("departments").select("*")
  departments.value = data || []
}

const departmentOptions = computed(() => departments.value)

// Load deans with join
async function loadDeans() {
  const { data, error } = await $supabase
    .from("deans")
    .select("id, department_id, user:users(*), department:departments(*)")

  if (error) {
    return showAlert("Error loading deans", "error")
  }

  deansData.value = data.map((d) => ({
    id: d.id,
    full_name: d.user?.full_name,
    email: d.user?.email,
    user_id: d.user?.id,
    auth_user_id: d.user?.auth_user_id,
    department_name: d.department?.name,
    department_id: d.department_id,
  }))
}

// Open create modal
function openCreateModal() {
  form.value = {
    id: null,
    full_name: "",
    email: "",
    department_id: null,
  }
  showModal.value = true
}

function editDean(dean) {
  form.value = { ...dean }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  form.value = {
    id: null,
    full_name: "",
    email: "",
    department_id: null,
  }
}

// Save dean
async function saveDean() {
  if (!form.value.email || !form.value.full_name || !form.value.department_id) {
    return showAlert("All fields are required", "error")
  }

  if (form.value.id === null) {
    // CREATE
    const response = await $fetch("/api/create-dean", {
      method: "POST",
      body: form.value,
    })

    if (response.error) {
      return showAlert(response.error, "error")
    }

    showAlert("Dean created successfully!", "success")
  } else {
    // Update is optional, not required in your project.
    showAlert("Dean editing not supported yet.", "info")
  }

  closeModal()
  loadDeans()
}

// Delete dean
function confirmDelete(dean) {
  deleteInfo.value = dean
  showDeleteDialog.value = true
}

async function deleteDeanNow() {
  const dean = deleteInfo.value

  const response = await $fetch("/api/delete-dean", {
    method: "POST",
    body: {
      dean_id: dean.id,
      user_table_id: dean.user_id,
      auth_user_id: dean.auth_user_id,
    },
  })

  if (response.error) {
    return showAlert(response.error, "error")
  }

  showDeleteDialog.value = false
  showAlert("Dean deleted successfully!", "success")
  loadDeans()
}
</script>


<style scoped>
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}
</style>
