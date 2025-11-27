<template>
  <div>
    <h2 class="text-h5 mb-4">Departments</h2>

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
      label="Search Department"
      prepend-inner-icon="mdi-magnify"
      class="mb-4"
      clearable
      density="compact"
    />

    <!-- ADD BUTTON -->
    <v-btn color="primary" class="mb-4" @click="openCreate">
      <v-icon left>mdi-plus</v-icon>
      Add Department
    </v-btn>

    <!-- TABLE -->
    <v-card>
      <v-data-table
        :items="filteredDepartments"
        :headers="headers"
        :loading="loading"
      >
        <template #item.actions="{ item }">
          <v-btn icon size="small" @click="editDepartment(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>

          <v-btn icon size="small" color="red" @click="confirmDelete(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- CREATE/EDIT MODAL -->
    <v-dialog v-model="showModal" max-width="480">
      <v-card>
        <v-card-title>{{ form.id ? "Edit Department" : "Create Department" }}</v-card-title>

        <v-card-text>
          <v-text-field v-model="form.name" label="Department Name" />

          <v-select
            v-model="form.type"
            label="Department Type"
            :items="['NORMAL', 'GENED']"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeModal">Cancel</v-btn>
          <v-btn color="primary" @click="saveDepartment">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DELETE CONFIRMATION -->
    <v-dialog v-model="showDeleteDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6">Delete Department?</v-card-title>

        <v-card-text>
          This will delete:
          <ul>
            <li>dean & dean auth account</li>
            <li>faculty</li>
            <li>subjects</li>
            <li>classes</li>
            <li>schedules</li>
            <li>schedule periods</li>
          </ul>
          <strong>This action cannot be undone.</strong>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="red" @click="deleteDepartmentNow">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useNuxtApp } from "#app"

definePageMeta({ layout: "admin" })

const { $supabase } = useNuxtApp()

const loading = ref(false)
const search = ref("")
const departments = ref([])

const showModal = ref(false)
const showDeleteDialog = ref(false)

const deleteTarget = ref(null)

const alertMessage = ref("")
const alertType = ref("success")

function showAlert(msg, type = "success") {
  alertMessage.value = msg
  alertType.value = type
  setTimeout(() => (alertMessage.value = ""), 2000)
}

const form = ref({
  id: null,
  name: "",
  type: "NORMAL"
})

const headers = [
  { title: "Name", key: "name" },
  { title: "Type", key: "type" },
  { title: "Actions", key: "actions", sortable: false }
]

onMounted(() => {
  loadDepartments()
})

async function loadDepartments() {
  loading.value = true
  const { data, error } = await $supabase
    .from("departments")
    .select("*")
    .order("name")

  if (!error) departments.value = data
  loading.value = false
}

const filteredDepartments = computed(() => {
  if (!search.value) return departments.value
  return departments.value.filter((d) =>
    d.name.toLowerCase().includes(search.value.toLowerCase())
  )
})

function openCreate() {
  form.value = { id: null, name: "", type: "NORMAL" }
  showModal.value = true
}

function editDepartment(dept) {
  form.value = { ...dept }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  form.value = { id: null, name: "", type: "NORMAL" }
}

async function saveDepartment() {
  if (!form.value.name) return showAlert("Department name is required", "error")

  const normalized_key = form.value.name.toLowerCase().replace(/\s+/g, "_")

  const { data: existing } = await $supabase
    .from("departments")
    .select("*")
    .eq("normalized_key", normalized_key)

  if (existing?.length && existing[0].id !== form.value.id) {
    return showAlert("Department already exists", "error")
  }

  if (form.value.id) {
    const { error } = await $supabase
      .from("departments")
      .update({
        name: form.value.name,
        type: form.value.type,
        normalized_key
      })
      .eq("id", form.value.id)

    if (error) return showAlert("Failed to update", "error")
    showAlert("Updated successfully")
  } else {
    const { error } = await $supabase
      .from("departments")
      .insert({
        name: form.value.name,
        type: form.value.type,
        normalized_key
      })

    if (error) return showAlert("Failed to create", "error")
    showAlert("Created successfully")
  }

  closeModal()
  loadDepartments()
}

function confirmDelete(dept) {
  deleteTarget.value = dept
  showDeleteDialog.value = true
}

async function deleteDepartmentNow() {
  const response = await $fetch("/api/delete-department", {
    method: "POST",
    body: { department_id: deleteTarget.value.id }
  })

  if (response.error) return showAlert(response.error, "error")

  showAlert("Department deleted")
  showDeleteDialog.value = false
  loadDepartments()
}
</script>

<style scoped>
.text-grey {
  color: #6b7280;
}
</style>
