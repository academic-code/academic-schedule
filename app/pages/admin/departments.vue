<template>
  <div>
    <h2 class="text-h5 mb-4">Departments</h2>

    <!-- ALERTS -->
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
    <v-btn color="primary" class="mb-4" @click="showCreateModal = true">
      <v-icon left>mdi-plus</v-icon>
      Add Department
    </v-btn>

    <!-- DEPARTMENTS TABLE -->
    <v-card>
      <v-table>
        <thead>
          <tr>
            <th class="text-left">Name</th>
            <th class="text-left">Key</th>
            <th class="text-left">Type</th>
            <th class="text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="dept in departments" :key="dept.id">
            <td>{{ dept.name }}</td>
            <td>{{ dept.normalized_key }}</td>
            <td>{{ dept.type }}</td>
            <td>
              <v-btn icon size="small" @click="editDepartment(dept)">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>

              <v-btn icon size="small" color="red" @click="deleteDepartment(dept.id)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- CREATE / EDIT MODAL -->
    <v-dialog v-model="showCreateModal" max-width="500">
      <v-card>
        <v-card-title>Create Department</v-card-title>

        <v-card-text>
          <v-text-field v-model="form.name" label="Department Name"></v-text-field>
          <v-select
            v-model="form.type"
            label="Department Type"
            :items="['NORMAL', 'GENED']"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" @click="closeModal">Cancel</v-btn>

          <v-btn color="primary" @click="saveDepartment">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useNuxtApp } from "#app"

definePageMeta({
  layout: "admin"
})

const { $supabase } = useNuxtApp()

// STATE
const departments = ref([])
const showCreateModal = ref(false)
const alertMessage = ref("")
const alertType = ref("success")

const form = ref({
  id: null,
  name: "",
  type: "NORMAL"
})

onMounted(() => {
  loadDepartments()
})

// LOAD ALL DEPARTMENTS
async function loadDepartments() {
  const { data, error } = await $supabase
    .from("departments")
    .select("*")
    .order("name")

  if (error) return console.error(error)
  departments.value = data
}

// SAVE DEPARTMENT
async function saveDepartment() {
  if (!form.value.name) {
    showAlert("Department name is required", "error")
    return
  }

  const normalized_key = form.value.name.toLowerCase().replace(/\s+/g, "_")

  // CHECK FOR DUPLICATE
  const { data: existing } = await $supabase
    .from("departments")
    .select("*")
    .eq("normalized_key", normalized_key)
    .limit(1)

  if (existing && existing.length > 0 && existing[0].id !== form.value.id) {
    showAlert("Department already exists", "error")
    return
  }

  if (form.value.id) {
    // UPDATE
    const { error } = await $supabase
      .from("departments")
      .update({
        name: form.value.name,
        type: form.value.type,
        normalized_key
      })
      .eq("id", form.value.id)

    if (error) return showAlert("Failed to update department", "error")
    showAlert("Department updated successfully!", "success")
  } else {
    // CREATE
    const { error } = await $supabase
      .from("departments")
      .insert({
        name: form.value.name,
        type: form.value.type,
        normalized_key
      })

    if (error) return showAlert("Failed to create department", "error")
    showAlert("Department created successfully!", "success")
  }

  closeModal()
  loadDepartments()
}

// DELETE DEPARTMENT
async function deleteDepartment(id) {
  const { error } = await $supabase
    .from("departments")
    .delete()
    .eq("id", id)

  if (error) return showAlert("Failed to delete department", "error")

  showAlert("Department deleted successfully!", "success")
  loadDepartments()
}

// EDIT
function editDepartment(dept) {
  form.value = { ...dept }
  showCreateModal.value = true
}

// CLOSE MODAL
function closeModal() {
  showCreateModal.value = false
  form.value = { id: null, name: "", type: "NORMAL" }
}

// ALERT
function showAlert(msg, type) {
  alertMessage.value = msg
  alertType.value = type
}
</script>
