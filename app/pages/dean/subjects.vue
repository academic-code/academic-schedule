<template>
  <div class="pa-6">
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h2 class="font-weight-bold">Subjects</h2>
        <p class="text-subtitle-2 text-grey">
          Manage subjects per curriculum
        </p>
      </div>

      <v-btn
        color="primary"
        :disabled="!filters.curriculum_id"
        @click="openCreate"
      >
        <v-icon start>mdi-plus</v-icon>
        New Subject
      </v-btn>
    </div>

    <SubjectFilters
      :filters="filters"
      :curriculums="curriculums"
    />

    <SubjectTable
      :items="subjectStore.subjects"
      :loading="subjectStore.loading"
      @edit="openEdit"
      @delete="deleteSubject"
    />

    <SubjectDrawer
      v-model="drawer"
      :editing="editing"
      :item="selected"
      :curriculumId="filters.curriculum_id"
      @save="handleSave"
    />

    <v-snackbar
      v-model="subjectStore.snackbar.show"
      :color="subjectStore.snackbar.color"
      location="top right"
      timeout="2500"
    >
      {{ subjectStore.snackbar.text }}
    </v-snackbar>
  </div>
</template>


<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue"
import { useSubjectStore } from "@/stores/useSubjectStore"

import SubjectTable from "@/components/subjects/SubjectTable.vue"
import SubjectDrawer from "@/components/subjects/SubjectDrawer.vue"
import SubjectFilters from "@/components/subjects/SubjectFilters.vue"

/* ================= STORE ================= */

const subjectStore = useSubjectStore()

/* ================= UI STATE ================= */

const drawer = ref(false)
const editing = ref(false)
const selected = ref<any | null>(null)

/* ================= FILTERS (STRONGLY TYPED) ================= */

interface SubjectFiltersState {
  curriculum_id: string | null
  year_level: number | null
  semester: number | null
}

const filters = reactive<SubjectFiltersState>({
  curriculum_id: null,
  year_level: null,
  semester: null
})

/* ================= CURRICULUM OPTIONS ================= */

const curriculums = ref<any[]>([]) // populated later (admin / curriculum module)

/* ================= LIFECYCLE ================= */

onMounted(() => {
  subjectStore.fetchSubjects()
})

/* ================= WATCH FILTERS ================= */

watch(
  () => ({ ...filters }),
  () => {
    subjectStore.fetchSubjects({
      curriculum_id: filters.curriculum_id,
      year_level: filters.year_level,
      semester: filters.semester
    })
  }
)

/* ================= ACTIONS ================= */

function openCreate() {
  if (!filters.curriculum_id) {
    subjectStore.showSnackbar(
      "Please select a curriculum first",
      "info"
    )
    return
  }

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
    await subjectStore.updateSubject(selected.value.id, payload)
  } else {
    await subjectStore.createSubject(payload)
  }
  drawer.value = false
}

async function deleteSubject(id: string) {
  await subjectStore.deleteSubject(id)
}
</script>
