<template>
  <div class="pa-6">
    <!-- HEADER -->
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h2 class="font-weight-bold">Faculty</h2>
        <p class="text-grey">Manage faculty under your department</p>
      </div>

      <v-btn
        color="primary"
        :disabled="isLocked"
        @click="openCreate"
      >
        <v-icon start>mdi-plus</v-icon>
        New Faculty
      </v-btn>
    </div>

    <!-- FILTERS -->
    <v-row class="mb-4" dense>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="search"
          label="Search faculty"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          density="comfortable"
        />
      </v-col>

      <v-col cols="12" md="4">
        <v-select
          v-model="typeFilter"
          label="Faculty Type"
          :items="typeOptions"
          clearable
          variant="outlined"
          density="comfortable"
        />
      </v-col>
    </v-row>

    <!-- LOCK ALERT -->
    <v-alert
      v-if="isLocked"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      Academic term is locked. Faculty modifications are disabled.
    </v-alert>

    <!-- TABLE -->
<FacultyTable
  :items="filteredFaculty"
  :loading="store.loading"
  :locked="isLocked"
  @edit="openEdit"
  @toggle="toggleStatus"
  @resend="resendInvite"
/>

    <!-- DRAWER -->
    <FacultyDrawer
      v-model="drawer"
      :editing="editing"
      :item="selected"
      @save="handleSave"
    />

    <!-- SNACKBAR -->
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
import { ref, onMounted, computed, onBeforeUnmount } from "vue"
import { useFacultyStore } from "@/stores/useFacultyStore"
import { useDeanDashboardStore } from "@/stores/useDeanDashboardStore"
import { useSupabase } from "@/composables/useSupabase"

import FacultyTable from "@/components/faculty/FacultyTable.vue"
import FacultyDrawer from "@/components/faculty/FacultyDrawer.vue"

const store = useFacultyStore()
const dashboard = useDeanDashboardStore()
const supabase = useSupabase()

const drawer = ref(false)
const editing = ref(false)
const selected = ref<any | null>(null)

const search = ref("")
const typeFilter = ref<string | null>(null)

const typeOptions = [
  { title: "All", value: null },
  { title: "Full-Time", value: "FULL_TIME" },
  { title: "Part-Time", value: "PART_TIME" }
]

const isLocked = computed(
  () => dashboard.academicTerm?.is_locked === true
)

const filteredFaculty = computed(() => {
  return store.faculty.filter(f => {
    const matchesSearch =
      !search.value ||
      `${f.first_name} ${f.last_name} ${f.email}`
        .toLowerCase()
        .includes(search.value.toLowerCase())

    const matchesType =
      !typeFilter.value || f.faculty_type === typeFilter.value

    return matchesSearch && matchesType
  })
})

let channel: any = null

onMounted(async () => {
  await store.fetchFaculty()

  channel = supabase
    .channel("faculty-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "faculty" },
      () => store.fetchFaculty()
    )
    .subscribe()
})

onBeforeUnmount(() => {
  if (channel) supabase.removeChannel(channel)
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
    await store.updateFaculty(selected.value.id, payload)
  } else {
    await store.createFaculty(payload)
  }
  drawer.value = false
}

async function resendInvite(item: any) {
  await store.resendInvite(item.id)
}

async function toggleStatus(item: any) {
  await store.toggleFaculty(item.id, !item.is_active)
}
</script>
