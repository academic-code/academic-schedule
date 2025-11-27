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

    <!-- SEARCH -->
    <v-text-field
      v-model="search"
      label="Search Dean"
      prepend-inner-icon="mdi-magnify"
      class="mb-4"
      clearable
      density="compact"
    />

    <!-- ADD BUTTON -->
    <v-btn color="primary" class="mb-4" @click="openCreateModal">
      <v-icon left>mdi-plus</v-icon>
      Add Dean
    </v-btn>

    <!-- DEANS TABLE -->
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredDeans"
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

    <!-- CREATE / EDIT MODAL -->
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
            label="Email"
            :disabled="form.id !== null"
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
import { useSupabase } from "~/composables/useSupabase"

definePageMeta({ layout: "admin" })

const supabase = useSupabase()

// STATE
const loading = ref(false)
const search = ref("")
const deansData = ref([])
const departments = ref([])

const showModal = ref(false)
const showDeleteDialog = ref(false)
const deleteInfo = ref(null)

const alertMessage = ref("")
const alertType = ref("success")

function showAlert(message, type = "success") {
  alertMessage.value = message
  alertType.value = type
  setTimeout(() => (alertMessage.value = ""), 2000)
}

// FORM
const form = ref({
  id: null,
  full_name: "",
  email: "",
  department_id: null,
  user_id: null,
  auth_user_id: null,
})

// HEADERS
const headers = [
  { title: "Name", key: "full_name" },
  { title: "Email", key: "email" },
  { title: "Department", key: "department_name" },
  { title: "Actions", key: "actions", sortable: false },
]

// LOAD DATA
onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  await loadDepartments()
  await loadDeans()
  loading.value = false
}

async function loadDepartments() {
  const { data } = await supabase.from("departments").select("*").order("name")
  departments.value = data || []
}

const departmentOptions = computed(() => departments.value)

async function loadDeans() {
  const { data, error } = await supabase
    .from("deans")
    .select("id, department_id, user:users(*), department:departments(*)")

  if (error) {
    showAlert("Error loading deans", "error")
    return
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

// FILTERED SEARCH
const filteredDeans = computed(() => {
  if (!search.value) return deansData.value
  return deansData.value.filter((d) =>
    `${d.full_name} ${d.email}`
      .toLowerCase()
      .includes(search.value.toLowerCase())
  )
})

// MODAL HANDLERS
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

// SAVE DEAN
async function saveDean() {
  if (!form.value.full_name || !form.value.email || !form.value.department_id) {
    return showAlert("All fields are required", "error")
  }

  // DUPLICATE CHECK
  if (form.value.id === null) {
    const { data: existing } = await supabase
      .from("users")
      .select("email")
      .eq("email", form.value.email)
      .limit(1)

    if (existing?.length) {
      return showAlert("Email already used", "error")
    }
  }

  if (form.value.id === null) {
    // CREATE
    const response = await $fetch("/api/create-dean", {
      method: "POST",
      body: form.value,
    })

    if (response.error) return showAlert(response.error, "error")

    showAlert("Dean created successfully!", "success")
  } else {
    // UPDATE DEAN
    const { error } = await supabase
      .from("users")
      .update({
        full_name: form.value.full_name,
      })
      .eq("id", form.value.user_id)

    if (error) return showAlert("Failed to update dean", "error")

    const { error: deanError } = await supabase
      .from("deans")
      .update({
        department_id: form.value.department_id,
      })
      .eq("id", form.value.id)

    if (deanError) return showAlert("Failed to update dean", "error")

    showAlert("Dean updated successfully", "success")
  }

  closeModal()
  loadDeans()
}

// DELETE
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

  if (response.error) return showAlert(response.error, "error")

  showAlert("Dean deleted successfully!", "success")
  showDeleteDialog.value = false
  loadDeans()
}
</script>


<style scoped>
.nav-active {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}
</style>
