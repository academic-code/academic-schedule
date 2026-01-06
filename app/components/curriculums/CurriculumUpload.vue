<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="font-weight-bold d-flex justify-space-between">
        Upload Subjects (CSV)

        <v-btn
          size="small"
          variant="tonal"
          prepend-icon="mdi-download"
          @click="downloadTemplate"
        >
          Download Template
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          Curriculum:
          <strong>{{ curriculum?.program }}</strong>
          ({{ curriculum?.curriculum_code }})
        </v-alert>

        <!-- FILE INPUT -->
        <v-file-input
          v-model="file"
          accept=".csv"
          label="Select CSV file"
          prepend-icon="mdi-file-upload"
          @update:model-value="parse"
        />

        <!-- HEADER ERROR -->
        <v-alert
          v-if="headerError"
          type="error"
          variant="tonal"
          class="mt-3"
        >
          {{ headerError }}
        </v-alert>

        <!-- PREVIEW TABLE -->
        <v-data-table
          v-if="preview.length"
          :headers="headers"
          :items="preview"
          class="mt-4"
          density="compact"
        >
          <template #item.subject_type="{ item }">
            <v-chip size="x-small" variant="tonal">
              {{ item.subject_type }}
            </v-chip>
          </template>

          <template #item.valid="{ item }">
            <v-chip
              size="x-small"
              :color="item.valid ? 'green' : 'red'"
              variant="tonal"
            >
              {{ item.valid ? "OK" : "Invalid" }}
            </v-chip>
          </template>

          <template #item.duplicate="{ item }">
            <v-chip
              size="x-small"
              :color="item.duplicate ? 'orange' : 'grey'"
              variant="tonal"
            >
              {{ item.duplicate ? "Duplicate" : "—" }}
            </v-chip>
          </template>
        </v-data-table>

        <v-alert
          v-if="invalidCount || duplicateCount"
          type="warning"
          variant="tonal"
          class="mt-3"
        >
          {{ invalidCount }} invalid rows and
          {{ duplicateCount }} duplicate rows will be skipped.
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!canUpload"
          @click="submit"
        >
          Upload
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"

/* ================= PROPS ================= */

const props = defineProps<{
  modelValue: boolean
  curriculum: any | null
}>()

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void
  (e: "submit", file: File): void
}>()

/* ================= STATE ================= */

const file = ref<File | null>(null)
const preview = ref<any[]>([])
const headerError = ref<string | null>(null)

/* ================= CONSTANTS ================= */

const REQUIRED_HEADERS = [
  "course_code",
  "description",
  "year_level",
  "semester",
  "lec_units",
  "lab_units"
]

/* ================= HELPERS ================= */

function detectSubjectType(code: string) {
  const upper = code.toUpperCase()
  if (upper.startsWith("G")) return "GENED"
  if (upper.startsWith("PATHFIT") || upper.startsWith("NSTP")) return "PE_NSTP"
  return "MAJOR"
}

/* ================= PARSER ================= */

function parse() {
  preview.value = []
  headerError.value = null
  if (!file.value) return

  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result as string
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return

    const headerLine = lines[0] ?? ""
    const headers = headerLine.split(",").map(h => h.trim())

    const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h))
    if (missing.length) {
      headerError.value = `Invalid CSV headers. Missing: ${missing.join(", ")}`
      return
    }

    const seen = new Set<string>()

    preview.value = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim())
      const row: any = {}

      headers.forEach((h, i) => (row[h] = values[i]))

      const key = `${row.course_code}-${row.year_level}-${row.semester}`
      const duplicate = seen.has(key)
      seen.add(key)

      const valid =
        !!row.course_code &&
        !!row.description &&
        !!row.year_level &&
        !!row.semester &&
        !duplicate

      return {
        ...row,
        subject_type: detectSubjectType(row.course_code),
        valid,
        duplicate
      }
    })
  }

  reader.readAsText(file.value)
}

/* ================= COMPUTED ================= */

const invalidCount = computed(() =>
  preview.value.filter(r => !r.valid).length
)

const duplicateCount = computed(() =>
  preview.value.filter(r => r.duplicate).length
)

const canUpload = computed(() =>
  !!file.value &&
  preview.value.length > 0 &&
  !headerError.value
)

/* ================= ACTIONS ================= */

function submit() {
  if (!file.value) return
  emit("submit", file.value)
  reset()
}

function close() {
  reset()
  emit("update:modelValue", false)
}

function reset() {
  file.value = null
  preview.value = []
  headerError.value = null
}

function downloadTemplate() {
  const csv =
    "course_code,description,year_level,semester,lec_units,lab_units\n" +
    "IT101,Introduction to Computing,1,1,3,0\n" +
    "GEC101,Understanding the Self,1,1,3,0\n" +
    "PATHFIT1,Physical Fitness 1,1,1,2,0\n" +
    "NSTP1,Civic Welfare Training Service 1,1,2,3,0"

  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = "subject_template.csv"
  a.click()

  URL.revokeObjectURL(url)
}

/* ================= TABLE HEADERS ================= */

const headers = [
  { title: "Code", value: "course_code" },
  { title: "Description", value: "description" },
  { title: "Year", value: "year_level" },
  { title: "Sem", value: "semester" },
  { title: "Type", value: "subject_type" },
  { title: "Duplicate", value: "duplicate" },
  { title: "Status", value: "valid" }
]
</script>
