<template>
  <div class="pa-6">
    <div class="d-flex justify-space-between mb-4">
      <div>
        <h2 class="font-weight-bold">Curriculums</h2>
        <p class="text-grey">Manage curriculum versions per program</p>
      </div>

      <v-btn color="primary" @click="openCreate">
        <v-icon start>mdi-plus</v-icon>
        New Curriculum
      </v-btn>
    </div>

    <CurriculumTable
      :items="store.items"
      :loading="store.loading"
      @edit="openEdit"
      @delete="remove"
      @upload="openUpload"
      @toggle="toggleActive"
    />

    <CurriculumDrawer
      v-model="drawer"
      :editing="editing"
      :item="selected"
      @save="save"
    />

    <CurriculumUpload
      v-model="uploadDialog"
      :curriculum="uploadTarget"
      @submit="uploadCSV"
    />

    <v-snackbar
      v-model="store.snackbar.show"
      :color="store.snackbar.color"
      location="top right"
      timeout="3000"
    >
      {{ store.snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useCurriculumStore } from "@/stores/useCurriculumStore"

import CurriculumTable from "@/components/curriculums/CurriculumTable.vue"
import CurriculumDrawer from "@/components/curriculums/CurriculumDrawer.vue"
import CurriculumUpload from "@/components/curriculums/CurriculumUpload.vue"

const store = useCurriculumStore()

const drawer = ref(false)
const editing = ref(false)
const selected = ref<any | null>(null)

const uploadDialog = ref(false)
const uploadTarget = ref<any | null>(null)

onMounted(() => store.fetch())

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

async function save(payload: any) {
  editing.value
    ? await store.update(selected.value.id, payload)
    : await store.create(payload)
  drawer.value = false
}

async function remove(id: string) {
  await store.delete(id)
}

async function toggleActive(id: string, value: boolean) {
  try {
    await store.update(id, { is_active: value })
  } catch {
    // rollback UI if backend fails
    const item = store.items.find(i => i.id === id)
    if (item) item.is_active = !value
  }
}


function openUpload(item: any) {
  uploadTarget.value = item
  uploadDialog.value = true
}

async function uploadCSV(file: File) {
  await store.uploadCSV(uploadTarget.value.id, file)
  uploadDialog.value = false
}
</script>
