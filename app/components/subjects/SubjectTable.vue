<template>
  <v-card elevation="1" class="pa-4">
    <!-- LEGEND -->
           <h2>LEGEND</h2>
    <div class="d-flex gap-3 mb-4">

      <v-chip size="small" color="success" variant="tonal">GENED</v-chip>
      <v-chip size="small" color="primary" variant="tonal">MAJOR</v-chip>
      <v-chip size="small" color="pink" variant="tonal">PE / NSTP</v-chip>
    </div>

    <!-- GROUPED BY YEAR -->
    <div
      v-for="(yearGroup, year) in grouped"
      :key="year"
      class="mb-8"
    >
      <!-- YEAR HEADER -->
      <h3 class="mb-3">Year {{ year }}</h3>

      <!-- GROUPED BY SEMESTER -->
      <div
        v-for="(semesterGroup, semester) in yearGroup"
        :key="semester"
        class="mb-6"
      >
        <h4 class="text-grey mb-2">
          Semester {{ semester }}
        </h4>

        <v-data-table
          :headers="headers"
          :items="semesterGroup"
          item-key="id"
          density="comfortable"
          :loading="loading"
        >
          <!-- COURSE CODE -->
          <template #item.course_code="{ item }">
            <strong>{{ item.course_code }}</strong>
          </template>

          <!-- DESCRIPTION -->
          <template #item.description="{ item }">
            <div class="text-truncate" style="max-width: 320px">
              {{ item.description }}
            </div>
          </template>

          <!-- TYPE -->
          <template #item.subject_type="{ item }">
            <v-chip
              size="x-small"
              variant="tonal"
              :color="typeColor(item.subject_type)"
            >
              {{ item.subject_type }}
            </v-chip>
          </template>

          <!-- UNITS -->
          <template #item.units="{ item }">
            {{ item.total_units }}
            <span class="text-caption text-grey">
              ({{ item.lec_units }}L / {{ item.lab_units }}Lab)
            </span>
          </template>

          <!-- STATUS -->
          <template #item.is_locked="{ item }">
            <v-chip
              size="x-small"
              :color="item.is_locked ? 'red' : 'green'"
              variant="tonal"
            >
              {{ item.is_locked ? "Locked" : "Editable" }}
            </v-chip>
          </template>

          <!-- ACTIONS -->
          <template #item.actions="{ item }">
            <v-tooltip text="Edit">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  :disabled="item.is_locked"
                  @click="$emit('edit', item)"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="Delete">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  color="error"
                  :disabled="item.is_locked"
                  @click="$emit('delete', item.id)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </template>

          <!-- EMPTY -->
          <template #no-data>
            <div class="text-center pa-4 text-grey">
              No subjects in this semester.
            </div>
          </template>
        </v-data-table>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  items: any[]
  loading: boolean
}>()

defineEmits<{
  (e: "edit", item: any): void
  (e: "delete", id: string): void
}>()

/* ---------- HEADERS (YEAR & SEM REMOVED) ---------- */
const headers = [
  { title: "Code", value: "course_code" },
  { title: "Description", value: "description" },
  { title: "Type", value: "subject_type" },
  { title: "Units", value: "units" },
  { title: "Status", value: "is_locked" },
  { title: "Actions", value: "actions", sortable: false }
]

/* ---------- GROUP SUBJECTS BY YEAR → SEM ---------- */
const grouped = computed(() => {
  const map: Record<number, Record<number, any[]>> = {}

  for (const s of props.items) {
    const year = s.year_level as number
    const sem = s.semester as number

    const yearMap = map[year] ?? (map[year] = {})
    if (!yearMap[sem]) {
      yearMap[sem] = []
    }
    yearMap[sem].push(s)
  }

  return map
})

/* ---------- TYPE COLORS ---------- */
function typeColor(type: string) {
  if (type === "GENED") return "success"
  if (type === "MAJOR") return "primary"
  return "pink"
}
</script>
