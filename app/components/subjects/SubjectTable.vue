<template>
  <v-card elevation="1" class="pa-4">
    <!-- LEGEND -->
    <h3 class="mb-2">Legend</h3>
    <div class="d-flex gap-3 mb-6">
      <v-chip size="small" color="success" variant="tonal">GENED</v-chip>
      <v-chip size="small" color="primary" variant="tonal">MAJOR</v-chip>
      <v-chip size="small" color="pink" variant="tonal">PE / NSTP</v-chip>
    </div>

    <!-- GROUP BY YEAR -->
    <div
      v-for="(yearGroup, year) in grouped"
      :key="year"
      class="mb-10"
    >
      <h3 class="mb-4">Year {{ year }}</h3>

      <!-- GROUP BY SEMESTER -->
      <div
        v-for="(semesterGroup, semester) in yearGroup"
        :key="semester"
        class="mb-8"
      >
        <div class="d-flex justify-space-between align-center mb-2">
          <h4 class="text-grey">
            Semester {{ semester }}
          </h4>

          <!-- TOTAL UNITS -->
          <strong class="text-primary">
            Total Units: {{ semesterUnits(semesterGroup) }}
          </strong>
        </div>

        <v-data-table
          :headers="headers"
          :items="semesterGroup"
          item-key="id"
          density="comfortable"
          :loading="loading"
        >
          <!-- CODE -->
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
                  @click="confirmDelete(item)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </template>

          <template #no-data>
            <div class="text-center pa-4 text-grey">
              No subjects in this semester.
            </div>
          </template>
        </v-data-table>
      </div>
    </div>

    <!-- DELETE CONFIRMATION DIALOG -->
    <v-dialog v-model="showConfirm" max-width="420">
      <v-card>
        <v-card-title class="font-weight-bold">
          Confirm Delete
        </v-card-title>

        <v-card-text>
          Are you sure you want to delete
          <strong>{{ selected?.course_code }}</strong>
          – {{ selected?.description }}?
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showConfirm = false">
            Cancel
          </v-btn>
          <v-btn color="error" @click="emitDelete">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"

/* ---------- PROPS ---------- */
const props = defineProps<{
  items: any[]
  loading: boolean
}>()

/* ---------- EMITS ---------- */
const emit = defineEmits<{
  (e: "edit", item: any): void
  (e: "delete", id: string): void
}>()

/* ---------- HEADERS ---------- */
const headers = [
  { title: "Code", value: "course_code" },
  { title: "Description", value: "description" },
  { title: "Type", value: "subject_type" },
  { title: "Units", value: "units" },
  { title: "Status", value: "is_locked" },
  { title: "Actions", value: "actions", sortable: false }
]

/* ---------- GROUPING ---------- */
const grouped = computed(() => {
  const map: Record<number, Record<number, any[]>> = {}

  for (const s of props.items) {
    const year = s.year_level
    const sem = s.semester

    const yearMap = map[year] ??= {}
    yearMap[sem] ??= []
    yearMap[sem].push(s)
  }

  return map
})

/* ---------- TOTAL UNITS ---------- */
function semesterUnits(items: any[]) {
  return items.reduce((sum, s) => sum + (s.total_units || 0), 0)
}

/* ---------- TYPE COLORS ---------- */
function typeColor(type: string) {
  if (type === "GENED") return "success"
  if (type === "MAJOR") return "primary"
  return "pink"
}

/* ---------- DELETE CONFIRM ---------- */
const showConfirm = ref(false)
const selected = ref<any | null>(null)

function confirmDelete(item: any) {
  selected.value = item
  showConfirm.value = true
}

function emitDelete() {
  if (!selected.value) return
  emit("delete", selected.value.id)
  showConfirm.value = false
  selected.value = null
}
</script>
