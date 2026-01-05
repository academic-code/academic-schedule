<template>
  <div class="pa-6">
    <!-- HEADER -->
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h2 class="font-weight-bold">Classes</h2>
        <p class="text-subtitle-2 text-grey">
          Manage classes under your department
        </p>
      </div>

      <v-btn
        color="primary"
        :disabled="isLocked"
        @click="openCreate"
      >
        <v-icon start>mdi-plus</v-icon>
        New Class
      </v-btn>
    </div>

    <!-- LOCK ALERT -->
    <v-alert
      v-if="isLocked"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      Academic term is locked. Class modifications are disabled.
    </v-alert>

    <!-- TABLE -->
    <ClassTable
      :items="classStore.classes"
      :loading="classStore.loading"
      @edit="openEdit"
      @delete="confirmDelete"
    />

    <!-- DRAWER -->
    <ClassDrawer
      v-model="drawer"
      :editing="editing"
      :item="selected"
      :isLocked="isLocked"
      @save="handleSave"
    />

    <!-- DELETE CONFIRM -->
    <v-dialog v-model="confirm" max-width="420">
      <v-card>
        <v-card-title class="font-weight-bold">
          Delete Class
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete this class?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirm = false">
            Cancel
          </v-btn>
          <v-btn color="error" @click="doDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- SNACKBAR -->
    <v-snackbar
      v-model="classStore.snackbar.show"
      :color="classStore.snackbar.color"
      location="top right"
      timeout="2500"
    >
      {{ classStore.snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useClassStore } from "@/stores/useClassStore"
import { useDeanDashboardStore } from "@/stores/useDeanDashboardStore"

import ClassTable from "@/components/classes/ClassTable.vue"
import ClassDrawer from "@/components/classes/ClassDrawer.vue"

const classStore = useClassStore()
const dashboard = useDeanDashboardStore()

const drawer = ref(false)
const editing = ref(false)
const selected = ref<any | null>(null)

const confirm = ref(false)
const deleteId = ref<string | null>(null)

const isLocked = computed(
  () => dashboard.academicTerm?.is_locked === true
)

onMounted(() => {
  classStore.fetchClasses()
})

function openCreate() {
  editing.value = false
  selected.value = null
  drawer.value = true
}

function openEdit(item: any) {
  editing.value = true
  selected.value = item
  drawer.value = true
}

async function handleSave(payload: any) {
  if (editing.value && selected.value) {
    await classStore.updateClass(selected.value.id, payload)
  } else {
    await classStore.createClass(payload)
  }
  drawer.value = false
}

function confirmDelete(id: string) {
  deleteId.value = id
  confirm.value = true
}

async function doDelete() {
  if (!deleteId.value) return
  await classStore.deleteClass(deleteId.value)
  confirm.value = false
}
</script>
