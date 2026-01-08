<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue"
import { useSubjectStore } from "@/stores/useSubjectStore"

import SubjectTable from "@/components/subjects/SubjectTable.vue"
import SubjectDrawer from "@/components/subjects/SubjectDrawer.vue"
import SubjectFilters from "@/components/subjects/SubjectFilters.vue"

const subjectStore = useSubjectStore()

/* ================= UI STATE ================= */

const drawer = ref(false)
const editing = ref(false)
const selected = ref<any | null>(null)

/* ================= FILTERS ================= */

const filters = reactive({
  program: null as string | null,
  curriculum_id: null as string | null,
  year_level: null as number | null,
  semester: null as number | null
})

/* ================= LIFECYCLE ================= */

onMounted(async () => {
  // 🔥 THIS WAS MISSING
  await subjectStore.fetchCurriculums()
  await subjectStore.fetchSubjects()
})

/* ================= WATCH FILTERS ================= */

watch(
  filters,
  () => {
    subjectStore.fetchSubjects(filters)
  },
  { deep: true }
)

/* ================= ACTIONS ================= */

function openCreate() {
  if (!filters.curriculum_id) {
    subjectStore.showSnackbar("Please select a curriculum first", "info")
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
  editing.value
    ? await subjectStore.updateSubject(selected.value.id, payload)
    : await subjectStore.createSubject(payload)

  drawer.value = false
}

async function deleteSubject(id: string) {
  await subjectStore.deleteSubject(id)
}
</script>

<template>
  <div class="pa-6">
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h2 class="font-weight-bold">Subjects</h2>
        <p class="text-grey">Manage subjects per curriculum</p>
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
      :curriculums="subjectStore.curriculums"
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
      timeout="3000"
    >
      {{ subjectStore.snackbar.text }}
    </v-snackbar>
  </div>
</template>
